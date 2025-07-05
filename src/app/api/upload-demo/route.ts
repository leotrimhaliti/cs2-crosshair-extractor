import { handleUpload, type HandleUploadBody } from "@vercel/blob/server"
import { NextResponse } from "next/server"

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeHandle: async (pathname, clientPayload) => {
        // You can add authentication or validation here if needed
        // For example, check if the user is logged in
        return {
          // You can return a custom filename here if you want
          // For now, we'll use the original filename from the client
          filename: clientPayload.filename,
        }
      },
      onComplete: async (blob, clientPayload) => {
        // This callback runs after the file is successfully uploaded to Blob storage
        console.log("Blob upload complete:", blob, "clientPayload:", clientPayload)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error("Error in /api/upload-demo:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
