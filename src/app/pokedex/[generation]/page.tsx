import AppHeader from '@/components/AppHeader'
import PokemonCard from '@/components/PokemonCard'
import db from '@/db'
import { collections, pokemons } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { notFound } from 'next/navigation'

export const runtime = 'edge'

export default async function GenerationPage(props: { params: Promise<{ generation: string }> }) {
  const params = await props.params;
  const gen = parseInt(params.generation)
  
  if (isNaN(gen) || gen < 1 || gen > 9) {
    notFound()
  }

  const mockUserId = 'user-1'
  let pokemonsList: any[] = []
  let ownedIds = new Set<string>()

  try {
    pokemonsList = await db.select()
      .from(pokemons)
      .where(eq(pokemons.generation, gen))
      .orderBy(asc(pokemons.pokedexNumber))
    
    const userCollections = await db.select({ pokemonId: collections.pokemonId })
      .from(collections)
      .innerJoin(pokemons, eq(collections.pokemonId, pokemons.id))
      .where(and(
        eq(collections.userId, mockUserId),
        eq(collections.owned, true),
        eq(pokemons.generation, gen)
      ))
    
    userCollections.forEach((c) => ownedIds.add(c.pokemonId))
  } catch (error) {
    console.error("Database connection failed", error)
  }

  const foundCount = ownedIds.size
  const totalCount = pokemonsList.length

  return (
    <>
      <AppHeader title={`${gen}ª Geração`} backTo="/" />
      
      <div className="p-4 max-w-md mx-auto">
        <div className="mb-4 text-center">
          <p className="text-gray-500 font-medium">{foundCount} / {totalCount} encontrados</p>
        </div>
        
        {pokemonsList.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-poke-dark rounded-xl border border-poke-gray dark:border-gray-700">
            <p className="text-gray-500">Nenhum Pokémon encontrado. Execute o seed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pokemonsList.map((p: any) => (
              <PokemonCard 
                key={p.id}
                id={p.id}
                pokedexNumber={p.pokedexNumber}
                name={p.name}
                imageUrl={p.imageUrl}
                owned={ownedIds.has(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
