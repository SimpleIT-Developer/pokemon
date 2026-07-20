import Image from 'next/image'
import { notFound } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import CollectionToggle from '@/components/CollectionToggle'
import db from '@/db'
import { collections, pokemons } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export default async function PokemonPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const mockUserId = 'user-1'

  const pResult = await db.select().from(pokemons).where(eq(pokemons.id, params.id)).limit(1)
  const pokemon = pResult[0]

  if (!pokemon) {
    notFound()
  }

  const cResult = await db.select().from(collections).where(and(
    eq(collections.userId, mockUserId),
    eq(collections.pokemonId, pokemon.id)
  )).limit(1)

  const collection = cResult[0] ?? null

  const isOwned = !!collection?.owned
  const quantity = collection?.quantity || 0
  const formattedNumber = String(pokemon.pokedexNumber).padStart(4, '0')

  return (
    <>
      <AppHeader title="Detalhes do Pokémon" />
      
      <div className="p-4 max-w-md mx-auto pb-24">
        <div className="bg-white dark:bg-poke-dark rounded-3xl p-6 shadow-sm border border-poke-gray dark:border-gray-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-gray-100 dark:from-gray-800 to-transparent opacity-50 pointer-events-none" />
          
          <div className="relative w-full aspect-square max-w-[250px] mx-auto mb-6">
            {pokemon.imageUrl ? (
              <Image 
                src={pokemon.imageUrl}
                alt={pokemon.name}
                fill
                className="object-contain drop-shadow-xl"
                sizes="(max-width: 768px) 100vw, 400px"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gray-100 rounded-xl animate-pulse" />
            )}
          </div>
          
          <div className="text-center">
            <span className="text-xl font-mono text-gray-500 font-medium">#{formattedNumber}</span>
            <h2 className="text-3xl font-black text-poke-dark dark:text-white mt-1 mb-2">
              {pokemon.name}
            </h2>
            
            <div className="flex justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-sm font-semibold rounded-full capitalize">
                {pokemon.primaryType}
              </span>
              {pokemon.secondaryType && (
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-sm font-semibold rounded-full capitalize">
                  {pokemon.secondaryType}
                </span>
              )}
            </div>
            
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
              {pokemon.generation}ª Geração
            </p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-poke-gray dark:border-gray-700">
            <div className="flex flex-col items-center mb-2">
              {isOwned ? (
                <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-2">
                  Você possui este Pokémon
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  Você ainda não possui este Pokémon
                </span>
              )}
            </div>
            
            <CollectionToggle 
              pokemonId={pokemon.id} 
              isOwned={isOwned} 
              quantity={quantity} 
            />
          </div>
        </div>
      </div>
    </>
  )
}
