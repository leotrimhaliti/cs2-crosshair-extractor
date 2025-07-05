import { getSignedUrl } from "@vercel/blob"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server" // Import NextRequest

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Read filename from query parameters, NOT from request body
  const filename = request.nextUrl.searchParams.get("filename")

  if (!filename) {
    return NextResponse.json({ error: "Filename is required in query parameters." }, { status: 400 })
  }

  try {
    // Use getSignedUrl to generate a URL for direct client-side upload.
    // This function does not take a 'body' argument for the file content.
    const { url } = await getSignedUrl(filename, {
      access: "public", // Or 'private' if you configure it
      method: "PUT", // Specify that the signed URL is for a PUT request
    })

    // Return the signed URL to the client.
    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("Error generating signed URL for Vercel Blob:", error)
    return NextResponse.json({ error: `Failed to get signed URL: ${error.message}` }, { status: 500 })
  }
}
