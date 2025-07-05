import { getSignedUrl } from "@vercel/blob" // Correct import for getSignedUrl
import { NextResponse } from "next/server"

export async function POST(request: Request): Promise<NextResponse> {
  // We expect the filename to be in the request body as JSON, not search params
  const { filename } = await request.json()

  if (!filename) {
    return NextResponse.json({ error: "Filename is required." }, { status: 400 })
  }

  try {
    // Use getSignedUrl to generate a URL for direct client-side upload.
    // This function does not take a 'body' argument for the file content.
    const { url } = await getSignedUrl(filename, {
      access: "public", // Or 'private' if you configure it
      // addRandomSuffix: false, // Removed, as getSignedUrl adds a hash by default for uniqueness
      // cacheControlMaxAge: 0, // Removed, not directly applicable to signed URL generation
      // The client will use this URL to PUT the file directly.
      method: "PUT", // Specify that the signed URL is for a PUT request
    })

    // Return the signed URL to the client.
    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("Error generating signed URL for Vercel Blob:", error)
    return NextResponse.json({ error: `Failed to get signed URL: ${error.message}` }, { status: 500 })
  }
}
