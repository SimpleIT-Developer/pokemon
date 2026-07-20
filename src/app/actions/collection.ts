'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const mockUserId = 'user-1'

export async function togglePokemonInCollection(pokemonId: string, currentlyOwned: boolean) {
  try {
    if (currentlyOwned) {
      await prisma.collection.delete({
        where: {
          userId_pokemonId: {
            userId: mockUserId,
            pokemonId,
          }
        }
      })
    } else {
      await prisma.collection.upsert({
        where: {
          userId_pokemonId: {
            userId: mockUserId,
            pokemonId,
          }
        },
        update: {
          owned: true,
        },
        create: {
          userId: mockUserId,
          pokemonId,
          owned: true,
          quantity: 1,
        }
      })
    }
    
    // Revalidate affected paths
    revalidatePath('/')
    revalidatePath('/pokedex/[generation]', 'page')
    revalidatePath('/pokemon/[id]', 'page')
    revalidatePath('/colecao', 'page')
    
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Erro ao atualizar coleção' }
  }
}

export async function updatePokemonQuantity(pokemonId: string, quantity: number) {
  try {
    if (quantity <= 0) {
      await togglePokemonInCollection(pokemonId, true)
      return { success: true }
    }
    
    await prisma.collection.update({
      where: {
        userId_pokemonId: {
          userId: mockUserId,
          pokemonId,
        }
      },
      data: { quantity }
    })
    
    revalidatePath('/pokemon/[id]', 'page')
    revalidatePath('/colecao', 'page')
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Erro ao atualizar quantidade' }
  }
}
