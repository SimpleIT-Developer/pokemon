import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const GENERATIONS = [
  { gen: 1, start: 1, end: 151 },
  { gen: 2, start: 152, end: 251 },
  { gen: 3, start: 252, end: 386 },
  { gen: 4, start: 387, end: 493 },
  { gen: 5, start: 494, end: 649 },
  { gen: 6, start: 650, end: 721 },
  { gen: 7, start: 722, end: 809 },
  { gen: 8, start: 810, end: 905 },
  { gen: 9, start: 906, end: 1025 },
]

function getGeneration(id: number) {
  for (const g of GENERATIONS) {
    if (id >= g.start && id <= g.end) return g.gen
  }
  return 1
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

async function syncPokemon() {
  console.log('Starting Pokémon sync from PokeAPI...')
  
  // To avoid hitting the API too hard, we'll process in chunks or sequentially
  const maxId = 1025
  
  for (let id = 1; id <= maxId; id++) {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
      if (!res.ok) {
        console.error(`Failed to fetch Pokemon #${id}`)
        continue
      }
      
      const data = await res.json()
      const primaryType = data.types.find((t: any) => t.slot === 1)?.type.name || 'normal'
      const secondaryType = data.types.find((t: any) => t.slot === 2)?.type.name || null
      
      // The official artwork is typically here:
      const imageUrl = data.sprites?.other?.['official-artwork']?.front_default 
        || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
        
      const spriteUrl = data.sprites?.front_default 
        || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
      
      const name = capitalize(data.name)
      const slug = data.name
      const pokedexNumber = id
      const generation = getGeneration(id)
      
      await prisma.pokemon.upsert({
        where: { pokedexNumber },
        update: {
          name,
          slug,
          generation,
          primaryType,
          secondaryType,
          imageUrl,
          spriteUrl,
        },
        create: {
          pokedexNumber,
          name,
          slug,
          generation,
          primaryType,
          secondaryType,
          imageUrl,
          spriteUrl,
        }
      })
      
      if (id % 50 === 0) {
        console.log(`Synced up to #${id}`)
      }
    } catch (err) {
      console.error(`Error syncing #${id}:`, err)
    }
    
    // Slight delay to be polite to PokeAPI
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  console.log('Pokémon sync completed!')
}

syncPokemon()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
