'use server'

import db from '@/db'
import { pokemons, collections } from '@/db/schema'
import { and, asc, eq, or, ilike, inArray } from 'drizzle-orm'
import { rankMatches, normalizeName } from '@/lib/similarity'

const mockUserId = 'user-1'

export interface IdentifiedPokemon {
  id: string
  pokedexNumber: number
  name: string
  imageUrl: string | null
  owned: boolean
}

export interface IdentifiedCard {
  name: string
  setName: string
  number: string
  rarity: string | null
  image: string | null
}

export interface CardOption {
  id: string
  name: string
  setName: string
  number: string
  rarity: string | null
  releaseDate: string | null
  image: string | null
}

export interface IdentifyResult {
  // identified: confident match. uncertain: weak match, ask the user to confirm.
  // not_found: nothing legible to match against.
  status: 'identified' | 'uncertain' | 'not_found'
  pokemon?: IdentifiedPokemon
  score?: number
  card?: IdentifiedCard | null
  /** Nearest guesses for the user to pick from when unsure. */
  suggestions: IdentifiedPokemon[]
}

const IDENTIFY_THRESHOLD = 0.7 // confident
const SUGGEST_THRESHOLD = 0.4 // worth offering as a guess

const TCG_ENDPOINT = 'https://api.pokemontcg.io/v2/cards'

async function fetchCard(
  pokedexNumber: number,
  collectorNumber: string | null,
): Promise<IdentifiedCard | null> {
  const key = process.env.POKEMON_TCG_API_KEY
  const headers: Record<string, string> = key ? { 'X-Api-Key': key } : {}
  const select = 'id,name,number,rarity,set,images,nationalPokedexNumbers'

  const queries = collectorNumber
    ? [
        `nationalPokedexNumbers:${pokedexNumber} number:${collectorNumber}`,
        `nationalPokedexNumbers:${pokedexNumber}`,
      ]
    : [`nationalPokedexNumbers:${pokedexNumber}`]

  for (const q of queries) {
    try {
      const url = `${TCG_ENDPOINT}?q=${encodeURIComponent(q)}&pageSize=1&select=${select}`
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) continue

      const json = (await res.json()) as { data?: any[] }
      const card = json.data?.[0]
      if (!card) continue

      return {
        name: card.name ?? '',
        setName: card.set?.name ?? '',
        number: card.number ?? '',
        rarity: card.rarity ?? null,
        image: card.images?.small ?? card.images?.large ?? null,
      }
    } catch {
      // Network/timeout: fall through so identification still succeeds.
    }
  }
  return null
}

/**
 * Every card for a given Pokémon, newest sets first, for the user to pick the
 * exact art/set they own. Empty on network failure so the UI can fall back to
 * plain "add to collection".
 */
export async function getCardsForPokemon(pokedexNumber: number): Promise<CardOption[]> {
  if (!Number.isInteger(pokedexNumber) || pokedexNumber < 1) return []

  const key = process.env.POKEMON_TCG_API_KEY
  const headers: Record<string, string> = key ? { 'X-Api-Key': key } : {}
  const select = 'id,name,number,rarity,set,images'
  const q = `nationalPokedexNumbers:${pokedexNumber}`
  // No server-side orderBy: sorting by set.releaseDate on the API is ~10x slower
  // (30s+) and blows the timeout. Fetch unsorted, order newest-first in JS.
  const url = `${TCG_ENDPOINT}?q=${encodeURIComponent(q)}&pageSize=60&select=${select}`

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return []
    const json = (await res.json()) as { data?: any[] }
    const cards: CardOption[] = (json.data ?? []).map((card) => ({
      id: card.id,
      name: card.name ?? '',
      setName: card.set?.name ?? '',
      number: card.number ?? '',
      rarity: card.rarity ?? null,
      releaseDate: card.set?.releaseDate ?? null,
      image: card.images?.small ?? card.images?.large ?? null,
    }))

    // releaseDate is "YYYY/MM/DD", so a string compare sorts chronologically.
    cards.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
    return cards
  } catch {
    return []
  }
}

/**
 * Resolve an OCR'd card to a Pokémon: fuzzy-match the read text against the
 * local Pokédex (typo-tolerant), then enrich with the specific card from
 * pokemontcg.io. The Pokémon identity never depends on the external API.
 */
export async function identifyCard(input: {
  candidates: string[]
  collectorNumber: string | null
}): Promise<IdentifyResult> {
  const candidates = (input.candidates ?? []).filter(
    (c) => typeof c === 'string' && c.trim().length >= 3,
  )
  if (candidates.length === 0) return { status: 'not_found', suggestions: [] }

  const all = await db
    .select({
      id: pokemons.id,
      pokedexNumber: pokemons.pokedexNumber,
      name: pokemons.name,
      imageUrl: pokemons.imageUrl,
    })
    .from(pokemons)

  const ranked = rankMatches(candidates, all)
  const top = ranked[0]

  if (!top || top.score < SUGGEST_THRESHOLD) {
    return { status: 'not_found', suggestions: [] }
  }

  const suggestionRows = ranked
    .filter((m) => m.score >= SUGGEST_THRESHOLD)
    .slice(0, 5)
    .map((m) => m.item)
  const suggestions = await withOwnership(suggestionRows)
  const pokemon = suggestions.find((s) => s.id === top.item.id) ?? { ...top.item, owned: false }

  // Only spend an API call once we have a plausible match.
  const card = await fetchCard(top.item.pokedexNumber, input.collectorNumber)
  const score = Number(top.score.toFixed(2))

  return {
    status: top.score >= IDENTIFY_THRESHOLD ? 'identified' : 'uncertain',
    pokemon,
    score,
    card,
    suggestions,
  }
}

const POKEMON_COLUMNS = {
  id: pokemons.id,
  pokedexNumber: pokemons.pokedexNumber,
  name: pokemons.name,
  imageUrl: pokemons.imageUrl,
} as const

type PokemonRow = { id: string; pokedexNumber: number; name: string; imageUrl: string | null }

/** Which of these Pokémon the mock user already owns. */
async function ownedSet(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const rows = await db
    .select({ id: collections.pokemonId })
    .from(collections)
    .where(
      and(
        eq(collections.userId, mockUserId),
        eq(collections.owned, true),
        inArray(collections.pokemonId, ids),
      ),
    )
  return new Set(rows.map((r) => r.id))
}

async function withOwnership(rows: PokemonRow[]): Promise<IdentifiedPokemon[]> {
  const owned = await ownedSet(rows.map((r) => r.id))
  return rows.map((r) => ({ ...r, owned: owned.has(r.id) }))
}

const MAX_POKEDEX = 1025

/**
 * Resolve a Pokémon by its National Pokédex number, fetching it from PokeAPI
 * and persisting it locally if the catalog hasn't been seeded yet. This is what
 * lets manual-by-number work on a fresh database.
 */
export async function findByNumber(n: number): Promise<IdentifiedPokemon | null> {
  if (!Number.isInteger(n) || n < 1 || n > MAX_POKEDEX) return null

  const existing = await db
    .select(POKEMON_COLUMNS)
    .from(pokemons)
    .where(eq(pokemons.pokedexNumber, n))
    .limit(1)
  if (existing[0]) return (await withOwnership(existing))[0]

  const data = await fetchSpeciesFromPokeApi(n)
  if (!data) return null

  await db
    .insert(pokemons)
    .values(data)
    .onConflictDoUpdate({ target: pokemons.pokedexNumber, set: data })

  const created = await db
    .select(POKEMON_COLUMNS)
    .from(pokemons)
    .where(eq(pokemons.pokedexNumber, n))
    .limit(1)
  return created[0] ? (await withOwnership(created))[0] : null
}

async function fetchSpeciesFromPokeApi(n: number) {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${n}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as any

    let generation = 1
    try {
      const speciesRes = await fetch(data.species.url, { signal: AbortSignal.timeout(8000) })
      if (speciesRes.ok) {
        const species = (await speciesRes.json()) as any
        const parsed = parseInt(String(species.generation?.url ?? '').split('/').filter(Boolean).pop() ?? '1', 10)
        if (!Number.isNaN(parsed)) generation = parsed
      }
    } catch {
      // Generation is non-critical; default to 1 if the species call fails.
    }

    return {
      pokedexNumber: data.id as number,
      name: data.name as string,
      generation,
      primaryType: data.types[0].type.name as string,
      secondaryType: (data.types[1]?.type.name ?? null) as string | null,
      imageUrl: (data.sprites.other['official-artwork'].front_default ?? data.sprites.front_default ?? null) as string | null,
    }
  } catch {
    return null
  }
}

/** Manual fallback search for the scanner's text box. */
export async function searchPokemon(query: string): Promise<IdentifiedPokemon[]> {
  const q = query.trim()
  if (!q) return []

  // Pure number: resolve via PokeAPI (creating the local row if missing).
  if (/^\d+$/.test(q)) {
    const found = await findByNumber(parseInt(q, 10))
    return found ? [found] : []
  }

  // Narrow with a SQL LIKE first, then rank the shortlist by fuzzy score so
  // near-misses still surface without scanning every row in JS.
  const rows = await db
    .select({
      id: pokemons.id,
      pokedexNumber: pokemons.pokedexNumber,
      name: pokemons.name,
      imageUrl: pokemons.imageUrl,
    })
    .from(pokemons)
    .where(or(ilike(pokemons.name, `%${q}%`), ilike(pokemons.name, `${q}%`)))
    .orderBy(asc(pokemons.pokedexNumber))
    .limit(10)

  if (rows.length > 0) return withOwnership(rows)

  // No substring hit — fall back to a fuzzy pass over the full list.
  const all = await db
    .select({
      id: pokemons.id,
      pokedexNumber: pokemons.pokedexNumber,
      name: pokemons.name,
      imageUrl: pokemons.imageUrl,
    })
    .from(pokemons)

  const qn = normalizeName(q)
  const matches = all
    .map((p) => ({ p, s: normalizeName(p.name).includes(qn) ? 1 : 0 }))
    .filter((x) => x.s > 0)
    .slice(0, 10)
    .map((x) => x.p)
  return withOwnership(matches)
}
