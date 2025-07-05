import { CrosshairExtractor } from "@/components/crosshair-extractor" // Ensure named import

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <CrosshairExtractor />
    </div>
  )
}
