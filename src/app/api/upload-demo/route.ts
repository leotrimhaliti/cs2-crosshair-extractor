import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get("filename")

  if (!filename) {
    return NextResponse.json({ error: "Filename is required." }, { status: 400 })
  }

  try {
    // The put function handles the actual upload to Vercel Blob storage.
    // It returns a signed URL that the client can use to upload the file directly.
    // We're using `access: 'public'` for simplicity, but you might want 'private'
    // if you need more control over access.
    const blob = await put(filename, request.body!, {
      access: "public",
    })

    // Return the URL of the uploaded blob. The frontend will use this URL
    // to tell the /api/extract-crosshair route where to find the demo file.
    return NextResponse.json(blob)
  } catch (error: any) {
    console.error("Error uploading to Vercel Blob:", error)
    return NextResponse.json({ error: `Failed to upload file: ${error.message}` }, { status: 500 })
  }
}
