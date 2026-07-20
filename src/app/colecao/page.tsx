import AppHeader from '@/components/AppHeader'
import PokemonCard from '@/components/PokemonCard'
import prisma from '@/lib/prisma'

export default async function ColecaoPage() {
  const mockUserId = 'user-1'
  let collections: any[] = []
  
  try {
    collections = await prisma.collection.findMany({
      where: { 
        userId: mockUserId,
        owned: true 
      },
      include: {
        pokemon: true
      },
      orderBy: {
        pokemon: {
          pokedexNumber: 'asc'
        }
      }
    })
  } catch (error) {
    console.error(error)
  }

  const uniquePokemons = collections.length
  const totalCards = collections.reduce((acc, curr) => acc + (curr.quantity || 1), 0)

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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {collections.map(c => (
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
        )}
      </div>
    </>
  )
}
