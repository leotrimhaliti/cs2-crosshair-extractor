"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Github, Upload, Loader2, CheckCircle, XCircle, Copy } from "lucide-react"
import Link from "next/link"
// No longer need upload from @vercel/blob/client as we're doing a direct fetch PUT
// import { upload } from "@vercel/blob/client"

interface PlayerCrosshair {
  name: string
  crosshair_code: string
}

export function CrosshairExtractor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<PlayerCrosshair[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0])
      setError(null)
      setResults([])
    } else {
      setSelectedFile(null)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedFile) {
      setError("Please select a CS2 demo file (.dem) to upload.")
      return
    }

    setLoading(true)
    setError(null)
    setResults([])

    try {
      // Step 1: Request a signed URL from our API route
      console.log("Frontend: Requesting signed URL for direct upload...")
      const signedUrlResponse = await fetch(`/api/get-signed-url?filename=${selectedFile.name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // This route expects JSON for filename
        },
        body: JSON.stringify({ filename: selectedFile.name }), // Send filename in body
      })

      if (!signedUrlResponse.ok) {
        const errorData = await signedUrlResponse.json()
        throw new Error(errorData.error || "Failed to get signed URL for upload.")
      }

      const { url: signedUrl } = await signedUrlResponse.json()
      console.log("Frontend: Received signed URL:", signedUrl)

      // Step 2: Upload the file directly to Vercel Blob using the signed URL
      console.log("Frontend: Uploading file directly to Vercel Blob via signed URL...")
      const directUploadResponse = await fetch(signedUrl, {
        method: "PUT", // Use PUT method for direct upload
        headers: {
          "Content-Type": selectedFile.type, // Set content type of the file
        },
        body: selectedFile, // Send the file directly as the body
      })

      if (!directUploadResponse.ok) {
        // Vercel Blob direct upload errors might not be JSON
        const errorText = await directUploadResponse.text()
        throw new Error(`Failed direct upload to Blob: ${directUploadResponse.status} - ${errorText}`)
      }

      const demoFileUrl = directUploadResponse.url // The URL of the uploaded blob
      console.log("Frontend: File successfully uploaded to Vercel Blob:", demoFileUrl)

      // Step 3: Call the extract-crosshair API route with the Blob URL
      console.log("Frontend: Sending request to /api/extract-crosshair with Blob URL.")
      const response = await fetch("/api/extract-crosshair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ demoFileUrl }),
      })
      console.log("Frontend: Received response object from extract-crosshair:", response)

      if (!response.ok) {
        let errorMessage = "Failed to extract crosshair codes."
        try {
          const errorText = await response.text()
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorMessage
          } catch (jsonParseError) {
            errorMessage = errorText || errorMessage
          }
        } catch (readError) {
          errorMessage = "An unknown error occurred and response body could not be read."
        }
        throw new Error(errorMessage)
      }

      const data: PlayerCrosshair[] = await response.json()
      console.log("Frontend: Successfully parsed JSON data:", data)
      setResults(data)
    } catch (err: unknown) {
      let errorMessage = "An unexpected error occurred."
      if (err instanceof Error) {
        errorMessage = err.message
      }
      setError(errorMessage)
      console.error("Frontend: Extraction error caught:", err)
    } finally {
      setLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setSelectedFile(null)
    }
  }

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(`cl_crosshair_code "${code}"`)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000) // Clear feedback after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err)
      setError("Failed to copy crosshair code.")
    }
  }

  return (
    <Card className="w-full max-w-2xl bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-800">
      <CardHeader className="flex flex-col items-center text-center p-8 pb-4">
        <CardTitle className="text-4xl font-extrabold tracking-tight mb-2">CS2 Crosshair Extractor</CardTitle>
        <CardDescription className="text-gray-400 text-lg max-w-md">
          Effortlessly extract crosshair configurations from your CS2 demo files.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid w-full items-center gap-2">
            <label htmlFor="demo-file" className="text-sm font-medium text-gray-300">
              Select CS2 Demo File (.dem)
            </label>
            <Input
              id="demo-file"
              type="file"
              accept=".dem"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="cursor-pointer bg-gray-800 text-white border-gray-700 file:text-white file:bg-gray-700 hover:file:bg-gray-600 transition-colors"
            />
            {selectedFile && <p className="text-sm text-gray-400 mt-1">Selected: {selectedFile.name}</p>}
          </div>
          <Button
            type="submit"
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-0.5"
            disabled={!selectedFile || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Extracting Crosshairs...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Extract Crosshairs
              </>
            )}
          </Button>
        </form>

        {error && (
          <div className="mt-6 flex items-center p-4 bg-red-900/30 text-red-300 rounded-lg border border-red-800">
            <XCircle className="h-5 w-5 mr-3" />
            <span className="font-medium">Error: {error}</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-200">Extracted Crosshair Codes:</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <Table className="w-full">
                <TableHeader className="bg-gray-800">
                  <TableRow className="border-gray-700">
                    <TableHead className="w-[180px] text-gray-300 font-bold text-base">Player Name</TableHead>
                    <TableHead className="text-gray-300 font-bold text-base">Crosshair Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((player, index) => (
                    <TableRow key={index} className="border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <TableCell className="font-medium text-gray-100 py-3">{player.name}</TableCell>
                      <TableCell className="font-mono text-sm text-gray-300 break-all py-3 flex items-center justify-between">
                        <span>{player.crosshair_code}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(player.crosshair_code)}
                          className="ml-2 p-1 h-auto text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                          aria-label={`Copy crosshair code for ${player.name}`}
                        >
                          {copiedCode === player.crosshair_code ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-5 text-sm text-gray-400 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Copy the code and paste it into the CS2 crosshair settings menu &quot;CODE_HERE&quot;
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            href="https://github.com/vercel" // Placeholder for your GitHub account
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Vercel's GitHub"
          >
            <Button variant="ghost" className="text-gray-500 hover:text-white hover:bg-gray-800 transition-colors p-4">
              <Github className="w-10 h-10" />
              <span className="sr-only">GitHub</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
