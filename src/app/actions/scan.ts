'use server'

import db from '@/db'
import { pokemons } from '@/db/schema'
import { asc, eq, or, ilike } from 'drizzle-orm'
import { bestMatch, normalizeName } from '@/lib/similarity'

export interface IdentifiedPokemon {
  id: string
  pokedexNumber: number
  name: string
  imageUrl: string | null
}

export interface IdentifiedCard {
  name: string
  setName: string
  number: string
  rarity: string | null
  image: string | null
}

export interface IdentifyResult {
  status: 'identified' | 'not_found'
  pokemon?: IdentifiedPokemon
  score?: number
  card?: IdentifiedCard | null
}

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
  if (candidates.length === 0) return { status: 'not_found' }

  const all = await db
    .select({
      id: pokemons.id,
      pokedexNumber: pokemons.pokedexNumber,
      name: pokemons.name,
      imageUrl: pokemons.imageUrl,
    })
    .from(pokemons)

  const match = bestMatch(candidates, all)
  if (!match) return { status: 'not_found' }

  const card = await fetchCard(match.item.pokedexNumber, input.collectorNumber)

  return {
    status: 'identified',
    pokemon: match.item,
    score: Number(match.score.toFixed(2)),
    card,
  }
}

/** Manual fallback search for the scanner's text box. */
export async function searchPokemon(query: string): Promise<IdentifiedPokemon[]> {
  const q = query.trim()
  if (!q) return []

  // Pure number: look up by Pokédex number directly.
  if (/^\d+$/.test(q)) {
    const rows = await db
      .select({
        id: pokemons.id,
        pokedexNumber: pokemons.pokedexNumber,
        name: pokemons.name,
        imageUrl: pokemons.imageUrl,
      })
      .from(pokemons)
      .where(eq(pokemons.pokedexNumber, parseInt(q, 10)))
      .limit(1)
    return rows
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

  if (rows.length > 0) return rows

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
  return all
    .map((p) => ({ p, s: normalizeName(p.name).includes(qn) ? 1 : 0 }))
    .filter((x) => x.s > 0)
    .slice(0, 10)
    .map((x) => x.p)
}
