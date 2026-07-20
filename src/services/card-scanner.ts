import { createWorker } from 'tesseract.js'

export interface OcrResult {
  /** Candidate name strings, best guesses first, to fuzzy-match server-side. */
  candidates: string[]
  /** Collector number printed at the card's bottom, e.g. "4" from "004/102". */
  collectorNumber: string | null
  confidence: number
  rawText: string
}

// --- image preprocessing -------------------------------------------------

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/**
 * Normalise the photo before OCR: scale toward ~1200px wide (Tesseract reads
 * small text poorly), convert to grayscale and stretch contrast. Returns a data
 * URL, or the original url if a canvas isn't available.
 */
async function preprocess(url: string): Promise<string> {
  try {
    const img = await loadImage(url)
    const targetW = 1200
    const scale = img.width > 0 ? targetW / img.width : 1
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return url

    ctx.drawImage(img, 0, 0, w, h)
    const data = ctx.getImageData(0, 0, w, h)
    const px = data.data

    // Grayscale + contrast stretch around mid-gray.
    const contrast = 1.35
    for (let i = 0; i < px.length; i += 4) {
      const gray = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
      let v = (gray - 128) * contrast + 128
      v = v < 0 ? 0 : v > 255 ? 255 : v
      px[i] = px[i + 1] = px[i + 2] = v
    }
    ctx.putImageData(data, 0, 0)
    return canvas.toDataURL('image/png')
  } catch {
    return url
  }
}

// --- OCR ------------------------------------------------------------------

interface Word {
  text: string
  height: number
  yCenter: number
}

// tesseract.js returns a nested blocks/paragraphs/lines/words tree; walk it
// defensively since the exact shape varies between builds.
function flattenWords(data: unknown, imageHeight: number): Word[] {
  const out: Word[] = []
  const blocks = (data as { blocks?: unknown[] })?.blocks
  if (!Array.isArray(blocks)) return out

  for (const block of blocks as any[]) {
    for (const para of block?.paragraphs ?? []) {
      for (const line of para?.lines ?? []) {
        for (const word of line?.words ?? []) {
          const text: string = word?.text ?? ''
          const bbox = word?.bbox
          if (!text || !bbox) continue
          const height = (bbox.y1 ?? 0) - (bbox.y0 ?? 0)
          const yCenter = ((bbox.y0 ?? 0) + (bbox.y1 ?? 0)) / 2
          out.push({
            text,
            height,
            yCenter: imageHeight > 0 ? yCenter / imageHeight : 0,
          })
        }
      }
    }
  }
  return out
}

const COLLECTOR_RE = /\b(\d{1,3})\s*\/\s*(\d{1,3})\b/
const NAME_CLEAN_RE = /[^A-Za-z'\- ]/g

function extractCandidates(words: Word[], rawText: string): string[] {
  const candidates: string[] = []

  // The species name is the tallest text in the upper part of the card.
  const upper = words
    .filter((w) => w.yCenter <= 0.5 && /[A-Za-z]{3,}/.test(w.text))
    .sort((a, b) => b.height - a.height)

  for (const w of upper.slice(0, 4)) {
    const cleaned = w.text.replace(NAME_CLEAN_RE, '').trim()
    if (cleaned.length >= 3) candidates.push(cleaned)
  }

  // Also try whole lines from the top, in case the name was split into words.
  const lines = rawText
    .split('\n')
    .map((l) => l.replace(NAME_CLEAN_RE, '').trim())
    .filter((l) => /[A-Za-z]{3,}/.test(l))
  for (const line of lines.slice(0, 3)) candidates.push(line)

  // Dedupe, preserve order.
  return [...new Set(candidates.map((c) => c.trim()).filter(Boolean))].slice(0, 6)
}

export async function scanPokemonCard(url: string): Promise<OcrResult> {
  const processed = await preprocess(url)

  const worker = await createWorker('eng')
  try {
    const { data } = await worker.recognize(processed, {}, { blocks: true })
    const rawText = data.text ?? ''

    // Best-effort image height for normalising word positions.
    const imageHeight =
      (data as { blocks?: any[] })?.blocks?.[0]?.bbox?.y1 ?? 0

    const words = flattenWords(data, imageHeight || 1)
    const candidates = extractCandidates(words, rawText)

    const collectorMatch = rawText.match(COLLECTOR_RE)
    const collectorNumber = collectorMatch
      ? String(parseInt(collectorMatch[1], 10))
      : null

    return {
      candidates,
      collectorNumber,
      confidence: data.confidence ?? 0,
      rawText,
    }
  } finally {
    await worker.terminate()
  }
}
