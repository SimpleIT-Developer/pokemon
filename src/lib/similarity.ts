// Fuzzy string matching helpers, used to correct OCR output against the known
// list of Pokémon names before hitting any external API. Kept pure so it can be
// reasoned about (and unit-tested) in isolation.

/** Lowercase and strip everything that OCR/naming inconsistencies add noise to. */
export function normalizeName(value: string): string {
  // NFD splits accented letters into base + combining mark; the final filter
  // then drops the marks along with punctuation, spaces and symbols.
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '')
}

function bigrams(value: string): string[] {
  const out: string[] = []
  for (let i = 0; i < value.length - 1; i++) out.push(value.slice(i, i + 2))
  return out
}

/** Sørensen–Dice coefficient over character bigrams. Range 0..1. */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const counts = new Map<string, number>()
  for (const g of bigrams(a)) counts.set(g, (counts.get(g) ?? 0) + 1)

  let intersection = 0
  const bg = bigrams(b)
  for (const g of bg) {
    const c = counts.get(g) ?? 0
    if (c > 0) {
      intersection++
      counts.set(g, c - 1)
    }
  }

  return (2 * intersection) / (bigrams(a).length + bg.length)
}

/**
 * Score a raw OCR candidate against a canonical name. Containment is weighted
 * highly because card titles often wrap the species name ("Blaine's Charizard",
 * "Charizard ex") and OCR often reads only a fragment of it.
 */
export function nameScore(candidate: string, canonical: string): number {
  const a = normalizeName(candidate)
  const b = normalizeName(canonical)
  if (!a || !b) return 0
  if (a === b) return 1
  if (b.length >= 4 && a.includes(b)) return 0.92 // canonical name sits inside the card title
  if (a.length >= 4 && b.includes(a)) return 0.9 // OCR caught a prefix of the name
  return diceCoefficient(a, b)
}

export interface Named {
  name: string
}

export interface Match<T extends Named> {
  item: T
  score: number
}

/**
 * Best canonical item across every OCR candidate. Returns null when the top
 * score is below `threshold`, so callers can fall back to manual search rather
 * than confidently show the wrong Pokémon.
 */
export function bestMatch<T extends Named>(
  candidates: string[],
  items: T[],
  threshold = 0.55,
): Match<T> | null {
  let best: Match<T> | null = null

  for (const item of items) {
    let score = 0
    for (const candidate of candidates) {
      const s = nameScore(candidate, item.name)
      if (s > score) score = s
    }
    if (!best || score > best.score) best = { item, score }
  }

  return best && best.score >= threshold ? best : null
}
