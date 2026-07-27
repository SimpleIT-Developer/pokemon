import AppHeader from '@/components/AppHeader'
import PokemonCard from '@/components/PokemonCard'
import db from '@/db'
import { collections, pokemons } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'

// Reads the user's collection, so it must not be prerendered at build time.
export const dynamic = 'force-dynamic'

export default async function ColecaoPage() {
  const mockUserId = 'user-1'

  const rawData = await db.select()
    .from(collections)
    .innerJoin(pokemons, eq(collections.pokemonId, pokemons.id))
    .where(and(
      eq(collections.userId, mockUserId),
      eq(collections.owned, true)
    ))
    .orderBy(asc(pokemons.pokedexNumber))

  const collectionsList = rawData.map(row => ({
    ...row.Collection,
    pokemon: row.Pokemon
  }))

  const uniquePokemons = collectionsList.length
  const totalCards = collectionsList.reduce((acc, curr) => acc + (curr.quantity || 1), 0)

  // Group by generation, keeping the pokedexNumber order within each group.
  const byGeneration = new Map<number, typeof collectionsList>()
  for (const c of collectionsList) {
    const gen = c.pokemon.generation
    if (!byGeneration.has(gen)) byGeneration.set(gen, [])
    byGeneration.get(gen)!.push(c)
  }
  const generations = [...byGeneration.entries()].sort((a, b) => a[0] - b[0])

  return (
    <>
      <AppHeader title="Minha Coleção" backTo="/" />
      
      <div className="p-4 max-w-md mx-auto">
        <div className="bg-poke-red text-white p-4 rounded-xl shadow-md mb-6 flex justify-around">
          <div className="text-center">
            <div className="text-sm font-medium opacity-90">Pokémon diferentes</div>
            <div className="text-3xl font-black">{uniquePokemons}</div>
          </div>
          <div className="w-px bg-white/30" />
          <div className="text-center">
            <div className="text-sm font-medium opacity-90">Total de cards</div>
            <div className="text-3xl font-black">{totalCards}</div>
          </div>
        </div>
        
        {uniquePokemons === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-poke-dark rounded-xl border border-poke-gray dark:border-gray-700">
            <p className="text-gray-500 mb-2">Sua coleção está vazia!</p>
            <p className="text-sm text-gray-400">Use o Scanner ou adicione manualmente.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {generations.map(([gen, items]) => (
              <section key={gen}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-black text-lg text-poke-dark dark:text-white">
                    {gen}ª Geração
                  </h2>
                  <span className="text-sm font-medium text-gray-500">{items.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {items.map((c) => (
                    <PokemonCard
                      key={c.pokemon.id}
                      id={c.pokemon.id}
                      pokedexNumber={c.pokemon.pokedexNumber}
                      name={c.pokemon.name}
                      imageUrl={c.pokemon.imageUrl}
                      owned={true}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
