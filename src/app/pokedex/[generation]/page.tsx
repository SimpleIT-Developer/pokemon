import AppHeader from '@/components/AppHeader'
import PokemonCard from '@/components/PokemonCard'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function GenerationPage(props: { params: Promise<{ generation: string }> }) {
  const params = await props.params;
  const gen = parseInt(params.generation)
  
  if (isNaN(gen) || gen < 1 || gen > 9) {
    notFound()
  }

  const mockUserId = 'user-1'
  let pokemons: any[] = []
  let ownedIds = new Set<string>()

  try {
    pokemons = await prisma.pokemon.findMany({
      where: { generation: gen },
      orderBy: { pokedexNumber: 'asc' }
    })
    
    const collections = await prisma.collection.findMany({
      where: { 
        userId: mockUserId, 
        owned: true,
        pokemon: { generation: gen }
      },
      select: { pokemonId: true }
    })
    
    collections.forEach(c => ownedIds.add(c.pokemonId))
  } catch (error) {
    console.error("Database connection failed", error)
  }

  const foundCount = ownedIds.size
  const totalCount = pokemons.length

  return (
    <>
      <AppHeader title={`${gen}ª Geração`} backTo="/" />
      
      <div className="p-4 max-w-md mx-auto">
        <div className="mb-4 text-center">
          <p className="text-gray-500 font-medium">{foundCount} / {totalCount} encontrados</p>
        </div>
        
        {pokemons.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-poke-dark rounded-xl border border-poke-gray dark:border-gray-700">
            <p className="text-gray-500">Nenhum Pokémon encontrado. Execute o seed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pokemons.map(p => (
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
