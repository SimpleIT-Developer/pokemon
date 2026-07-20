'use server'

import db from '@/db'
import { collections, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

const mockUserId = 'user-1'

// collections.userId is a FK to users; until real auth exists, make sure the
// mock user row is present so inserts don't fail with a FK violation.
async function ensureMockUser() {
  await db
    .insert(users)
    .values({ id: mockUserId, email: 'treinador@local', name: 'Treinador' })
    .onConflictDoNothing()
}

export async function togglePokemonInCollection(pokemonId: string, currentlyOwned: boolean) {
  try {
    await ensureMockUser()

    if (currentlyOwned) {
      await db.delete(collections).where(and(
        eq(collections.userId, mockUserId),
        eq(collections.pokemonId, pokemonId)
      ))
    } else {
      await db.insert(collections).values({
        userId: mockUserId,
        pokemonId,
        owned: true,
        quantity: 1,
      }).onConflictDoUpdate({
        target: [collections.userId, collections.pokemonId],
        set: { owned: true }
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
    
    await db.update(collections).set({ quantity }).where(and(
      eq(collections.userId, mockUserId),
      eq(collections.pokemonId, pokemonId)
    ))
    
    revalidatePath('/pokemon/[id]', 'page')
    revalidatePath('/colecao', 'page')
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Erro ao atualizar quantidade' }
  }
}
