'use client'

import { useState } from 'react'
import PokemonCard from '@/components/PokemonCard'
import clsx from 'clsx'

export interface GridPokemon {
  id: string
  pokedexNumber: number
  name: string
  imageUrl: string | null
  owned: boolean
}

type Filter = 'all' | 'owned' | 'missing'

export default function GenerationGrid({ items }: { items: GridPokemon[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  const ownedCount = items.filter((p) => p.owned).length
  const missingCount = items.length - ownedCount

  const visible =
    filter === 'owned'
      ? items.filter((p) => p.owned)
      : filter === 'missing'
        ? items.filter((p) => !p.owned)
        : items

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: items.length },
    { key: 'owned', label: 'Tenho', count: ownedCount },
    { key: 'missing', label: 'Faltantes', count: missingCount },
  ]

  return (
    <>
      <div className="flex gap-2 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-full">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={clsx(
              'flex-1 py-2 rounded-full text-sm font-bold transition-colors',
              filter === t.key
                ? 'bg-poke-red text-white shadow'
                : 'text-gray-500 dark:text-gray-400',
            )}
          >
            {t.label}
            <span className="ml-1 opacity-80">({t.count})</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-poke-dark rounded-xl border border-poke-gray dark:border-gray-700">
          <p className="text-gray-500">
            {filter === 'owned' ? 'Você ainda não tem nenhum desta geração.' : 'Nada aqui.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visible.map((p) => (
            <PokemonCard
              key={p.id}
              id={p.id}
              pokedexNumber={p.pokedexNumber}
              name={p.name}
              imageUrl={p.imageUrl}
              owned={p.owned}
            />
          ))}
        </div>
      )}
    </>
  )
}
