import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"

// Set the maximum duration for this serverless function to 5 minutes (300 seconds)
export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null

  try {
    const formData = await request.formData()
    const demoFile = formData.get("demoFile") as File | null

    if (!demoFile) {
      console.log("API Route: No demo file provided.")
      return NextResponse.json({ error: "No demo file provided." }, { status: 400 })
    }

    // Dynamically require demoparser2
    // This is necessary because demoparser2 is a native Node.js module
    console.log("API Route: Attempting to require @laihoe/demoparser2")
    const demoparser = require("@laihoe/demoparser2")
    console.log("API Route: @laihoe/demoparser2 successfully required.")

    console.log("--- demoparser2 module loaded in API Route ---")
    console.log("demoparser object:", demoparser)
    console.log("Type of demoparser.parseEvent:", typeof demoparser.parseEvent)
    console.log("Type of demoparser.parseTicks:", typeof demoparser.parseTicks)
    console.log("---------------------------------")

    if (typeof demoparser.parseEvent !== "function" || typeof demoparser.parseTicks !== "function") {
      console.error("API Route: demoparser2 functions not found.")
      throw new Error(
        "demoparser2 functions (parseEvent, parseTicks) are not available. Module might not have loaded correctly or exports are different.",
      )
    }

    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.dem`
    tempFilePath = path.join(os.tmpdir(), uniqueFileName)

    const arrayBuffer = await demoFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await fs.writeFile(tempFilePath, buffer)
    console.log(`API Route: Temporary file written to: ${tempFilePath}`)

    let gameEndTick = -1
    let playersDataAtEndTick = []
    const playerFields = ["crosshair_code", "name", "kills_total", "deaths_total"]

    console.log("API Route: Attempting to parse round_end events.")
    try {
      const roundEnds = demoparser.parseEvent(tempFilePath, "round_end")
      console.log("API Route: Parsed round_end events. Count:", roundEnds.length)
      if (roundEnds && roundEnds.length > 0) {
        gameEndTick = Math.max(...roundEnds.map((x) => x.tick))
        console.log("API Route: Determined gameEndTick from round_end:", gameEndTick)
      } else {
        console.warn("API Route: No 'round_end' events found.")
      }
    } catch (e) {
      console.error("API Route: Error parsing round_end events:", e)
      console.warn("API Route: Failed to parse 'round_end' events. Falling back to all ticks.")
    }

    if (gameEndTick === -1 || gameEndTick === 0) {
      console.log("API Route: Attempting to parse all ticks for fallback end tick.")
      try {
        const allTicks = demoparser.parseTicks(tempFilePath, playerFields)
        console.log("API Route: Parsed all ticks. Total ticks:", allTicks.length)
        if (allTicks.length > 0) {
          gameEndTick = allTicks[allTicks.length - 1].tick
          console.log("API Route: Using last tick as gameEndTick:", gameEndTick)
        } else {
          console.warn("API Route: No ticks found in the demo file at all.")
        }
      } catch (e) {
        console.error("API Route: Error parsing all ticks for fallback:", e)
        throw new Error("Failed to parse any ticks from the demo file, cannot determine end tick.")
      }
    }

    if (gameEndTick > 0) {
      console.log(`API Route: Attempting to parse players data at tick ${gameEndTick}.`)
      try {
        playersDataAtEndTick = demoparser.parseTicks(tempFilePath, playerFields, [gameEndTick])
        console.log("API Route: Parsed players data at end tick.")
      } catch (e) {
        console.error(`API Route: Error parsing players data at tick ${gameEndTick}:`, e)
        throw new Error(`Failed to extract player data at the determined end tick.`)
      }
    } else {
      console.warn("API Route: No valid gameEndTick determined, cannot parse player data at a specific tick.")
    }

    const extractedCrosshairs: { name: string; crosshair_code: string; kills: number | null; deaths: number | null }[] =
      []
    if (playersDataAtEndTick && playersDataAtEndTick.length > 0) {
      // demoparser2 returns an array of tick data, we need the last one for final player states
      const lastTickData = playersDataAtEndTick[playersDataAtEndTick.length - 1]
      if (lastTickData && lastTickData.players) {
        for (const steamId in lastTickData.players) {
          const player = lastTickData.players[steamId]
          if (player.crosshair_code) {
            extractedCrosshairs.push({
              name: player.name || `Player ${steamId}`,
              crosshair_code: player.crosshair_code,
              kills: player.kills_total !== undefined ? player.kills_total : null,
              deaths: player.deaths_total !== undefined ? player.deaths_total : null,
            })
          }
        }
      }
      console.log("API Route: Successfully extracted crosshairs. Count:", extractedCrosshairs.length)
    } else {
      console.warn("API Route: No player data found at the end tick after parsing.")
    }

    if (extractedCrosshairs.length === 0) {
      console.log("API Route: No crosshair codes found in the demo.")
      return NextResponse.json(
        { error: "No crosshair codes found in the demo. Ensure it's a valid CS2 demo and contains player data." },
        { status: 404 },
      )
    }

    return NextResponse.json(extractedCrosshairs)
  } catch (error: any) {
    console.error("API Route: Error processing demo file in main catch block:", error)
    return NextResponse.json({ error: `Failed to process demo: ${error.message || error}` }, { status: 500 })
  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath)
        console.log(`API Route: Temporary file deleted: ${tempFilePath}`)
      } catch (unlinkError) {
        console.error(`API Route: Error deleting temporary file ${tempFilePath}:`, unlinkError)
      }
    }
  }
}
