// src/app/api/get-signed-url/route.ts
// IMPORTANT: Change the import path for generateClientTokenFromReadWriteToken
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client"; // <--- CHANGE THIS LINE!
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log("API Route: /api/get-signed-url (Token Generation) - Start");

  const { filename, contentType } = await request.json();

  if (!filename || !contentType) {
    console.error("API Route: /api/get-signed-url - Filename and Content-Type are required.");
    return NextResponse.json(
      { error: "Filename and Content-Type are required in request body." },
      { status: 400 }
    );
  }

  try {
    const clientToken = await generateClientTokenFromReadWriteToken({
      pathname: filename,
      access: "public",
      contentType: contentType,
    });

    console.log("API Route: /api/get-signed-url - Successfully generated client token.");
    return NextResponse.json({ clientToken });
  } catch (error: any) {
    console.error("API Route: /api/get-signed-url - Error generating client token:", error);
    return NextResponse.json({ error: `Failed to generate client token: ${error.message}` }, { status: 500 });
  }
}