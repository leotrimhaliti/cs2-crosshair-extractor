import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { del } from "@vercel/blob" // Import del to delete the blob after processing

// Set the maximum duration for this serverless function to 5 minutes (300 seconds)
export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null
  let blobUrl: string | null = null // To store the blob URL for deletion

  try {
    // The request body now contains a JSON object with the blobUrl
    const { demoFileUrl } = await request.json()

    if (!demoFileUrl) {
      return NextResponse.json({ error: "No demo file URL provided." }, { status: 400 })
    }

    blobUrl = demoFileUrl // Store the URL for deletion in finally block

    // Dynamically require demoparser2
    const demoparser = require("@laihoe/demoparser2")

    if (typeof demoparser.parseEvent !== "function" || typeof demoparser.parseTicks !== "function") {
      throw new Error(
        "demoparser2 functions (parseEvent, parseTicks) are not available. Module might not have loaded correctly or exports are different.",
      )
    }

    // 1. Download the demo file from the Blob URL to a temporary location
    const response = await fetch(demoFileUrl)
    if (!response.ok) {
      throw new Error(`Failed to download demo file from Blob storage: ${response.statusText}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.dem`
    tempFilePath = path.join(os.tmpdir(), uniqueFileName)

    await fs.writeFile(tempFilePath, buffer)

    let gameEndTick = -1
    let playersDataAtEndTick = []
    const playerFields = ["crosshair_code", "name"]

    try {
      const roundEnds = demoparser.parseEvent(tempFilePath, "round_end")
      if (roundEnds && roundEnds.length > 0) {
        gameEndTick = Math.max(...roundEnds.map((x) => x.tick))
      } else {
        console.warn("API Route: No 'round_end' events found.")
      }
    } catch (e) {
      console.error("API Route: Error parsing round_end events:", e)
      console.warn("API Route: Failed to parse 'round_end' events. Falling back to all ticks.")
    }

    if (gameEndTick === -1 || gameEndTick === 0) {
      try {
        const allTicks = demoparser.parseTicks(tempFilePath, playerFields)
        if (allTicks.length > 0) {
          gameEndTick = allTicks[allTicks.length - 1].tick
        } else {
          console.warn("API Route: No ticks found in the demo file at all.")
        }
      } catch (e) {
        console.error("API Route: Error parsing all ticks for fallback:", e)
        throw new Error("Failed to parse any ticks from the demo file, cannot determine end tick.")
      }
    }

    if (gameEndTick > 0) {
      try {
        playersDataAtEndTick = demoparser.parseTicks(tempFilePath, playerFields, [gameEndTick])
      } catch (e) {
        console.error(`API Route: Error parsing players data at tick ${gameEndTick}:`, e)
        throw new Error(`Failed to extract player data at the determined end tick.`)
      }
    } else {
      console.warn("API Route: No valid gameEndTick determined, cannot parse player data at a specific tick.")
    }

    const extractedCrosshairs: { name: string; crosshair_code: string }[] = []
    if (playersDataAtEndTick && playersDataAtEndTick.length > 0) {
      const lastTickData = playersDataAtEndTick[playersDataAtEndTick.length - 1]
      if (lastTickData && lastTickData.players) {
        for (const steamId in lastTickData.players) {
          const player = lastTickData.players[steamId]
          if (player.crosshair_code) {
            extractedCrosshairs.push({
              name: player.name || `Player ${steamId}`,
              crosshair_code: player.crosshair_code,
            })
          }
        }
      }
    } else {
      console.warn("API Route: No player data found at the end tick after parsing.")
    }

    if (extractedCrosshairs.length === 0) {
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
      } catch (unlinkError) {
        console.error(`API Route: Error deleting temporary file ${tempFilePath}:`, unlinkError)
      }
    }
    // Optionally delete the blob after successful processing
    if (blobUrl) {
      try {
        await del(blobUrl)
        console.log(`API Route: Blob deleted: ${blobUrl}`)
      } catch (blobDeleteError) {
        console.error(`API Route: Error deleting blob ${blobUrl}:`, blobDeleteError)
      }
    }
  }
}
