'use client'

import { useState, useTransition } from 'react'
import { togglePokemonInCollection, updatePokemonQuantity } from '@/app/actions/collection'
import { Check, Plus, Minus, Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  pokemonId: string
  isOwned: boolean
  quantity: number
}

export default function CollectionToggle({ pokemonId, isOwned, quantity }: Props) {
  const [isPending, startTransition] = useTransition()
  const [optimisticOwned, setOptimisticOwned] = useState(isOwned)
  const [optimisticQuantity, setOptimisticQuantity] = useState(quantity)

  const handleToggle = () => {
    startTransition(async () => {
      setOptimisticOwned(!optimisticOwned)
      if (!optimisticOwned && optimisticQuantity === 0) setOptimisticQuantity(1)
      await togglePokemonInCollection(pokemonId, optimisticOwned)
    })
  }

  const handleQuantity = (change: number) => {
    startTransition(async () => {
      const newQuantity = Math.max(0, optimisticQuantity + change)
      setOptimisticQuantity(newQuantity)
      if (newQuantity === 0) {
        setOptimisticOwned(false)
      }
      await updatePokemonQuantity(pokemonId, newQuantity)
    })
  }

  return (
    <div className="flex flex-col gap-4 mt-6">
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={clsx(
          "flex items-center justify-center gap-2 py-3 px-6 rounded-full font-bold text-white transition-all shadow-md active:scale-95",
          optimisticOwned 
            ? "bg-red-500 hover:bg-red-600" 
            : "bg-poke-blue hover:bg-poke-blue-light"
        )}
      >
        {isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : optimisticOwned ? (
          <>
            <span>Remover da minha Pokédex</span>
          </>
        ) : (
          <>
            <Plus className="w-5 h-5" />
            <span>Adicionar à minha Pokédex</span>
          </>
        )}
      </button>

      {optimisticOwned && (
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <span className="font-medium">Quantidade de cards:</span>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleQuantity(-1)}
              disabled={isPending || optimisticQuantity <= 1}
              className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="font-bold text-lg w-6 text-center">{optimisticQuantity}</span>
            <button 
              onClick={() => handleQuantity(1)}
              disabled={isPending}
              className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
