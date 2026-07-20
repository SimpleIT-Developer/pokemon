import { pokemons } from '../db/schema'
import db from '../db'
import { eq } from 'drizzle-orm'

async function fetchPokemonData(id: number) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
  if (!response.ok) throw new Error(`Failed to fetch pokemon ${id}`)
  const data = await response.json()
  
  const speciesResponse = await fetch(data.species.url)
  const speciesData = await speciesResponse.json()
  
  const generationUrl = speciesData.generation.url
  const genNumber = parseInt(generationUrl.split('/').filter(Boolean).pop() || '1')

  return {
    pokedexNumber: data.id,
    name: data.name,
    generation: genNumber,
    primaryType: data.types[0].type.name,
    secondaryType: data.types[1]?.type.name || null,
    imageUrl: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
  }
}

async function main() {
  console.log('Starting Pokemon sync (1 to 1025)...')
  
  for (let i = 1; i <= 1025; i++) {
    try {
      console.log(`Fetching #${i}...`)
      const data = await fetchPokemonData(i)
      
      await db.insert(pokemons).values({
        pokedexNumber: data.pokedexNumber,
        name: data.name,
        generation: data.generation,
        primaryType: data.primaryType,
        secondaryType: data.secondaryType,
        imageUrl: data.imageUrl,
      }).onConflictDoUpdate({
        target: pokemons.pokedexNumber,
        set: data
      })
      
      console.log(`Saved #${i} ${data.name}`)
    } catch (error) {
      console.error(`Error on pokemon ${i}:`, error)
    }
  }
  
  console.log('Sync completed!')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
