import AppHeader from '@/components/AppHeader'
import GenerationGrid from '@/components/GenerationGrid'
import db from '@/db'
import { collections, pokemons } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { notFound } from 'next/navigation'

export default async function GenerationPage(props: { params: Promise<{ generation: string }> }) {
  const params = await props.params;
  const gen = parseInt(params.generation)
  
  if (isNaN(gen) || gen < 1 || gen > 9) {
    notFound()
  }

  const mockUserId = 'user-1'

  const pokemonsList = await db.select()
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

  const ownedIds = new Set<string>(userCollections.map((c) => c.pokemonId))

  const foundCount = ownedIds.size
  const totalCount = pokemonsList.length

  const items = pokemonsList.map((p) => ({
    id: p.id,
    pokedexNumber: p.pokedexNumber,
    name: p.name,
    imageUrl: p.imageUrl,
    owned: ownedIds.has(p.id),
  }))

  return (
    <>
      <AppHeader title={`${gen}ª Geração`} backTo="/" />

      <div className="p-4 max-w-md mx-auto">
        <div className="mb-4 text-center">
          <p className="text-gray-500 font-medium">{foundCount} / {totalCount} encontrados</p>
        </div>

        {totalCount === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-poke-dark rounded-xl border border-poke-gray dark:border-gray-700">
            <p className="text-gray-500">Nenhum Pokémon encontrado. Execute o seed.</p>
          </div>
        ) : (
          <GenerationGrid items={items} />
        )}
      </div>
    </>
  )
}
