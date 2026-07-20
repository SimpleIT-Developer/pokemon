import Tesseract from 'tesseract.js'

export interface ScanResult {
  pokemonName: string | null
  pokedexNumber: number | null
  confidence: number
  rawText: string
}

export type ScanProvider = 'OCR' | 'AI_VISION' | 'MANUAL'

export async function scanPokemonCard(imageElement: HTMLImageElement | string): Promise<ScanResult> {
  console.log('Starting OCR scan...')
  try {
    const result = await Tesseract.recognize(
      imageElement,
      'eng',
      { logger: m => console.log(m) }
    )
    
    const text = result.data.text
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    let pokedexNumber: number | null = null
    let pokemonName: string | null = null
    
    // Patterns to find something like "N° 069", "#069", "No. 069"
    const numberRegex = /(?:N[°ºo]\.?|#)\s*0*(\d{1,4})/i
    
    for (const line of lines) {
      const match = line.match(numberRegex)
      if (match && match[1]) {
        const num = parseInt(match[1])
        if (num >= 1 && num <= 1025) {
          pokedexNumber = num
          break
        }
      }
    }
    
    // If we didn't find the number, we might just return the longest word or first capitalized word as a name guess
    // Realistically, without a local list of pokemon names, fuzzy matching is hard on the client side without loading all 1025 names.
    // We will extract a potential name (usually top of the card)
    if (!pokedexNumber && lines.length > 0) {
      // Very naive MVP: take the first line that has letters as a guess
      const wordLine = lines.find(l => /[A-Za-z]{3,}/.test(l))
      if (wordLine) {
        pokemonName = wordLine.replace(/[^A-Za-z]/g, '')
      }
    }

    return {
      pokemonName,
      pokedexNumber,
      confidence: result.data.confidence,
      rawText: text
    }
  } catch (error) {
    console.error('OCR Error:', error)
    return {
      pokemonName: null,
      pokedexNumber: null,
      confidence: 0,
      rawText: ''
    }
  }
}
