// src/app/api/get-signed-url/route.ts
// Changed to import from '@vercel/blob/client' as generateClientTokenFromReadWriteToken is exported from there.
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log("API Route: /api/get-signed-url (Token Generation) - Start");

  // The frontend will send filename and contentType in the request body.
  const { filename, contentType } = await request.json();

  if (!filename || !contentType) {
    console.error("API Route: /api/get-signed-url - Filename and Content-Type are required.");
    return NextResponse.json(
      { error: "Filename and Content-Type are required in request body." },
      { status: 400 }
    );
  }

  try {
    // This function automatically picks up BLOB_READ_WRITE_TOKEN from environment variables.
    const clientToken = await generateClientTokenFromReadWriteToken({
      pathname: filename,
      access: "public", // Set the desired access level for the uploaded blob (e.g., 'public', 'private')
      contentType: contentType, // Pass the content type received from the frontend
      // You can add other options here that will be enforced on the client token, e.g.:
      // addRandomSuffix: true,
      // allowOverwrite: false,
      // cacheControlMaxAge: 3600, // Cache for 1 hour
    });

    console.log("API Route: /api/get-signed-url - Successfully generated client token.");
    // Return the generated clientToken to the frontend.
    return NextResponse.json({ clientToken });
  } catch (error: any) {
    console.error("API Route: /api/get-signed-url - Error generating client token:", error);
    // Return a 500 Internal Server Error with a detailed message.
    return NextResponse.json({ error: `Failed to generate client token: ${error.message}` }, { status: 500 });
  }
}