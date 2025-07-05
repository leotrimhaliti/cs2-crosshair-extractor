"use client"

import type React from "react"
import { useState, useRef, useMemo } from "react" // Import useMemo
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Github, Upload, Loader2, CheckCircle, XCircle, Copy, ArrowDownNarrowWide } from "lucide-react" // Import ArrowDownNarrowWide
import Link from "next/link"

interface PlayerCrosshair {
  name: string
  crosshair_code: string
  kills?: number | null
  deaths?: number | null
}

// IMPORTANT: This URL is read from .env.local
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

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

    const formData = new FormData()
    formData.append("demoFile", selectedFile)

    try {
      const response = await fetch(`${BACKEND_URL}/api/extract-crosshair`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to extract crosshair codes.")
      }

      const data: PlayerCrosshair[] = await response.json()
      setResults(data)
    } catch (err: unknown) {
      // Changed 'any' to 'unknown'
      let errorMessage = "An unexpected error occurred."
      if (err instanceof Error) {
        // Safely check if it's an Error object
        errorMessage = err.message
      }
      setError(errorMessage)
      console.error("Extraction error:", err)
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

  // Use useMemo to sort results by kills in descending order
  const sortedResults = useMemo(() => {
    if (!results || results.length === 0) {
      return []
    }
    return [...results].sort((a, b) => {
      // Treat null or undefined kills as 0 for sorting purposes
      const killsA = a.kills ?? 0
      const killsB = b.kills ?? 0
      return killsB - killsA // Descending order (most kills first)
    })
  }, [results])

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
                    <TableHead className="text-gray-300 font-bold text-base text-center flex items-center justify-center">
                      Kills <ArrowDownNarrowWide className="ml-1 h-4 w-4" /> {/* Sort icon */}
                    </TableHead>
                    <TableHead className="text-gray-300 font-bold text-base text-center">Deaths</TableHead>
                    <TableHead className="text-gray-300 font-bold text-base">Crosshair Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedResults.map((player, index) => (
                    <TableRow key={index} className="border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <TableCell className="font-medium text-gray-100 py-3">{player.name}</TableCell>
                      <TableCell className="text-gray-300 py-3 text-center">
                        {player.kills !== null ? player.kills : "-"}
                      </TableCell>
                      <TableCell className="text-gray-300 py-3 text-center">
                        {player.deaths !== null ? player.deaths : "-"}
                      </TableCell>
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
              Copy the code and paste it into the CS2 crosshair settings menu &quot;&quot;`
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
