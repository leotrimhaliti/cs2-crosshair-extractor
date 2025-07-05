import { getSignedUrl } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { filename } = await request.json()

    if (!filename) {
      return NextResponse.json({ error: "Filename is required." }, { status: 400 })
    }

    // Add `body` property as empty string to fix "body is required" error
    const { url } = await getSignedUrl({
      filename,
      access: "public",
      method: "PUT",
      body: "", // Required for signature calculation
    })

    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("Error generating signed URL for Vercel Blob:", error)
    return NextResponse.json({ error: `Failed to get signed URL: ${error.message}` }, { status: 500 })
  }
}
