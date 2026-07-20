import AppHeader from '@/components/AppHeader'
import ProgressBar from '@/components/ProgressBar'
import GenerationCard from '@/components/GenerationCard'
import db from '@/db'
import { collections, pokemons } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// Reads the user's collection, so it must not be prerendered at build time.
export const dynamic = 'force-dynamic'

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

export default async function DashboardPage() {
  // We assume a default user for MVP since auth isn't fully implemented
  const mockUserId = 'user-1'
  
  const maxTotal = 1025
  const genStats: Record<number, number> = {}

  const userCollections = await db.select({
    pokemonId: collections.pokemonId,
    generation: pokemons.generation,
  }).from(collections)
    .innerJoin(pokemons, eq(collections.pokemonId, pokemons.id))
    .where(and(eq(collections.userId, mockUserId), eq(collections.owned, true)))

  const totalFound = userCollections.length

  // Group by generation
  for (const g of GENERATIONS) {
    genStats[g.gen] = 0
  }

  for (const item of userCollections) {
    if (item.generation) {
      genStats[item.generation] = (genStats[item.generation] || 0) + 1
    }
  }

  return (
    <>
      <AppHeader title="Minha Pokédex" />
      
      <div className="p-4 max-w-md mx-auto space-y-6">
        <section>
          <ProgressBar 
            found={totalFound} 
            total={maxTotal} 
            label="Progresso Nacional" 
          />
        </section>
        
        <section>
          <h2 className="text-xl font-bold mb-4 text-poke-dark dark:text-gray-200">
            Gerações
          </h2>
          <div className="flex flex-col gap-3">
            {GENERATIONS.map((g) => (
              <GenerationCard 
                key={g.gen}
                gen={g.gen}
                start={g.start}
                end={g.end}
                total={g.end - g.start + 1}
                found={genStats[g.gen] || 0}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
