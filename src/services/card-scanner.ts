import { createWorker, type Worker } from 'tesseract.js'

export interface OcrResult {
  /** Candidate name strings, best guesses first, to fuzzy-match against. */
  candidates: string[]
  /** Collector number printed at the card's bottom, e.g. "66" from "066/188". */
  collectorNumber: string | null
  confidence: number
  rawText: string
}

// --- persistent worker ----------------------------------------------------
// Live scanning recognises many frames, so the Tesseract worker (which loads
// several MB of WASM + language data) is created once and reused.

let workerPromise: Promise<Worker> | null = null

async function getWorker(): Promise<Worker> {
  if (!workerPromise) workerPromise = createWorker('eng')
  return workerPromise
}

export async function terminateScanner(): Promise<void> {
  const p = workerPromise
  workerPromise = null
  if (p) {
    try {
      await (await p).terminate()
    } catch {
      // already gone
    }
  }
}

// --- image preprocessing --------------------------------------------------

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/** Draw a source onto a canvas at the given size, grayscale + contrast-boosted. */
function preprocess(source: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.drawImage(source, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h)
  const px = data.data
  const contrast = 1.35
  for (let i = 0; i < px.length; i += 4) {
    const gray = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
    let v = (gray - 128) * contrast + 128
    v = v < 0 ? 0 : v > 255 ? 255 : v
    px[i] = px[i + 1] = px[i + 2] = v
  }
  ctx.putImageData(data, 0, 0)
  return canvas
}

// --- OCR ------------------------------------------------------------------

interface Word {
  text: string
  height: number
  yCenter: number
}

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
          out.push({ text, height, yCenter: imageHeight > 0 ? yCenter / imageHeight : 0 })
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

  const upper = words
    .filter((w) => w.yCenter <= 0.5 && /[A-Za-z]{3,}/.test(w.text))
    .sort((a, b) => b.height - a.height)

  for (const w of upper.slice(0, 4)) {
    const cleaned = w.text.replace(NAME_CLEAN_RE, '').trim()
    if (cleaned.length >= 3) candidates.push(cleaned)
  }

  const lines = rawText
    .split('\n')
    .map((l) => l.replace(NAME_CLEAN_RE, '').trim())
    .filter((l) => /[A-Za-z]{3,}/.test(l))
  for (const line of lines.slice(0, 3)) candidates.push(line)

  return [...new Set(candidates.map((c) => c.trim()).filter(Boolean))].slice(0, 6)
}

async function recognize(canvas: HTMLCanvasElement): Promise<OcrResult> {
  const worker = await getWorker()
  const { data } = await worker.recognize(canvas, {}, { blocks: true })
  const rawText = data.text ?? ''
  const imageHeight = (data as { blocks?: any[] })?.blocks?.[0]?.bbox?.y1 ?? canvas.height

  const words = flattenWords(data, imageHeight || 1)
  const candidates = extractCandidates(words, rawText)

  const collectorMatch = rawText.match(COLLECTOR_RE)
  const collectorNumber = collectorMatch ? String(parseInt(collectorMatch[1], 10)) : null

  return { candidates, collectorNumber, confidence: data.confidence ?? 0, rawText }
}

/** OCR a single live video frame. Returns empty candidates if the video isn't ready. */
export async function scanVideoFrame(video: HTMLVideoElement): Promise<OcrResult> {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) {
    return { candidates: [], collectorNumber: null, confidence: 0, rawText: '' }
  }
  const targetW = 1000
  const scale = targetW / vw
  const canvas = preprocess(video, Math.round(vw * scale), Math.round(vh * scale))
  return recognize(canvas)
}

/** OCR a still image (gallery upload / manual flow). */
export async function scanPokemonCard(url: string): Promise<OcrResult> {
  const img = await loadImage(url)
  const targetW = 1200
  const scale = img.width > 0 ? targetW / img.width : 1
  const canvas = preprocess(img, Math.round(img.width * scale), Math.round(img.height * scale))
  return recognize(canvas)
}
