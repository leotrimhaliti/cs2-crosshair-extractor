import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get("filename")

  if (!filename) {
    return NextResponse.json({ error: "Filename is required." }, { status: 400 })
  }

  try {
    // Generate a signed URL for direct client-side upload.
    // The 'put' function here is used to get a signed URL, not to perform the upload itself.
    // We use `addRandomSuffix: false` to keep the filename clean, and `cacheControlMaxAge: 0`
    // to ensure the URL is not cached.
    const { url } = await put(filename, "", {
      access: "public", // Or 'private' if you configure it
      addRandomSuffix: false, // We want the exact filename
      cacheControlMaxAge: 0, // Do not cache the signed URL
    })

    // Return the signed URL to the client. The client will then upload the file directly to this URL.
    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("Error generating signed URL for Vercel Blob:", error)
    return NextResponse.json({ error: `Failed to get signed URL: ${error.message}` }, { status: 500 })
  }
}
