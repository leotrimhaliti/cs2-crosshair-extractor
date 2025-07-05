import { getSignedUrl } from "@vercel/blob" // Revert to the standard named import
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log("API Route: get-signed-url - Start")
  // Add logs to inspect the imported function
  console.log("API Route: get-signed-url - Type of getSignedUrl:", typeof getSignedUrl)
  console.log("API Route: get-signed-url - Value of getSignedUrl:", getSignedUrl)

  const filename = request.nextUrl.searchParams.get("filename")

  if (!filename) {
    console.error("API Route: get-signed-url - Filename is required.")
    return NextResponse.json({ error: "Filename is required in query parameters." }, { status: 400 })
  }

  try {
    const { url } = await getSignedUrl(filename, {
      access: "public",
      method: "PUT",
    })
    console.log("API Route: get-signed-url - Successfully generated signed URL.")
    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("API Route: get-signed-url - Error generating signed URL for Vercel Blob:", error)
    return NextResponse.json({ error: `Failed to get signed URL: ${error.message}` }, { status: 500 })
  }
}
