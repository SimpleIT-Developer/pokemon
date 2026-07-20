'use client'

import { useState, useRef, useTransition } from 'react'
import AppHeader from '@/components/AppHeader'
import { Camera, Upload, RefreshCcw, Search, Check, Plus, Loader2, Eye } from 'lucide-react'
import { scanPokemonCard } from '@/services/card-scanner'
import {
  identifyCard,
  searchPokemon,
  type IdentifyResult,
  type IdentifiedPokemon,
} from '@/app/actions/scan'
import { togglePokemonInCollection } from '@/app/actions/collection'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

type Phase = 'idle' | 'ocr' | 'identifying' | 'done'

export default function ScannerPage() {
  const [image, setImage] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<IdentifyResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<IdentifiedPokemon[] | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [isSearching, startSearch] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const reset = () => {
    setImage(null)
    setPhase('idle')
    setResult(null)
    setSearchQuery('')
    setSearchResults(null)
  }

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setImage(url)
    setResult(null)
    setSearchResults(null)
    processImage(url)
    e.target.value = '' // allow re-picking the same file
  }

  const processImage = async (url: string) => {
    try {
      setPhase('ocr')
      const ocr = await scanPokemonCard(url)

      setPhase('identifying')
      const res = await identifyCard({
        candidates: ocr.candidates,
        collectorNumber: ocr.collectorNumber,
      })
      setResult(res)
    } catch (error) {
      console.error('Scan failed', error)
      setResult({ status: 'not_found' })
    } finally {
      setPhase('done')
    }
  }

  const addToCollection = (pokemonId: string) => {
    startTransition(async () => {
      const r = await togglePokemonInCollection(pokemonId, false)
      if (r.success) setAdded((prev) => new Set(prev).add(pokemonId))
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    startSearch(async () => {
      setSearchResults(await searchPokemon(q))
    })
  }

  const busy = phase === 'ocr' || phase === 'identifying'

  return (
    <>
      <AppHeader title="Scanner de Cartas" />

      <div className="p-4 max-w-md mx-auto pb-24">
        {!image ? (
          <CaptureArea onPick={() => fileInputRef.current?.click()} />
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-full aspect-[3/4] max-w-[300px] rounded-2xl overflow-hidden shadow-xl mb-6">
              {/* Preview is a blob/data URL, so a plain img is appropriate here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Carta escaneada" className="w-full h-full object-cover" />
              {busy && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                  <RefreshCcw className="w-10 h-10 animate-spin mb-4" />
                  <p className="font-bold text-lg">
                    {phase === 'ocr' ? 'Lendo a carta...' : 'Identificando...'}
                  </p>
                </div>
              )}
            </div>

            {phase === 'done' && result?.status === 'identified' && result.pokemon && (
              <IdentifiedView
                result={result}
                added={added.has(result.pokemon.id)}
                isPending={isPending}
                onAdd={() => addToCollection(result.pokemon!.id)}
                onView={() => router.push(`/pokemon/${result.pokemon!.id}`)}
                onRetry={reset}
              />
            )}

            {phase === 'done' && result?.status === 'not_found' && (
              <NotFoundView
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearch={handleSearch}
                isSearching={isSearching}
                results={searchResults}
                added={added}
                isPending={isPending}
                onAdd={addToCollection}
                onView={(id) => router.push(`/pokemon/${id}`)}
                onRetry={reset}
              />
            )}
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageCapture}
        />
      </div>
    </>
  )
}

function CaptureArea({ onPick }: { onPick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-poke-gray dark:border-gray-700 rounded-3xl bg-gray-50 dark:bg-gray-800/50 relative overflow-hidden">
      <div className="absolute inset-8 border-2 border-poke-blue/30 rounded-xl pointer-events-none" />
      <Camera className="w-16 h-16 text-gray-400 mb-4" />
      <p className="text-gray-500 font-medium text-center px-8 mb-6">
        Posicione o card dentro da área, com boa iluminação e o nome bem visível.
      </p>
      <div className="flex gap-4">
        <button
          onClick={onPick}
          className="flex items-center gap-2 bg-poke-red text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-poke-red-dark active:scale-95 transition-all"
        >
          <Camera className="w-5 h-5" />
          Câmera
        </button>
        <button
          onClick={onPick}
          className="flex items-center gap-2 bg-white dark:bg-poke-dark text-poke-dark dark:text-white border border-gray-200 dark:border-gray-700 px-6 py-3 rounded-full font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all"
        >
          <Upload className="w-5 h-5" />
          Galeria
        </button>
      </div>
    </div>
  )
}

function IdentifiedView({
  result,
  added,
  isPending,
  onAdd,
  onView,
  onRetry,
}: {
  result: IdentifyResult
  added: boolean
  isPending: boolean
  onAdd: () => void
  onView: () => void
  onRetry: () => void
}) {
  const p = result.pokemon!
  const card = result.card
  const uncertain = (result.score ?? 0) < 0.7

  return (
    <div className="w-full bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
      <h3 className="text-green-500 font-bold text-lg mb-4 text-center">
        Pokémon Identificado!
      </h3>

      <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
        {p.imageUrl && (
          <Image
            src={p.imageUrl}
            alt={p.name}
            width={72}
            height={72}
            className="w-[72px] h-[72px] object-contain flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <div className="text-sm font-mono text-gray-500">
            #{String(p.pokedexNumber).padStart(4, '0')}
          </div>
          <div className="text-2xl font-black uppercase text-poke-dark dark:text-white truncate">
            {p.name}
          </div>
          {card?.setName && (
            <div className="text-xs text-gray-500 mt-1 truncate">
              {card.setName} · {card.number}
              {card.rarity ? ` · ${card.rarity}` : ''}
            </div>
          )}
        </div>
        {card?.image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={card.image}
            alt={card.name}
            className="w-14 rounded-md shadow ml-auto flex-shrink-0"
          />
        )}
      </div>

      {uncertain && (
        <p className="text-center text-xs text-amber-500 font-medium mb-4">
          Identificação com baixa confiança. Confira se é este o Pokémon.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={onAdd}
          disabled={isPending || added}
          className={clsx(
            'flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white shadow-md transition-all active:scale-95',
            added ? 'bg-green-500' : 'bg-poke-red hover:bg-poke-red-dark',
          )}
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : added ? (
            <>
              <Check className="w-5 h-5" /> Adicionado à coleção
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" /> Adicionar à coleção
            </>
          )}
        </button>
        <button
          onClick={onView}
          className="flex items-center justify-center gap-2 bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 py-3 rounded-full font-bold"
        >
          <Eye className="w-5 h-5" /> Ver Pokémon
        </button>
        <button
          onClick={onRetry}
          className="py-2 text-sm text-gray-500 font-medium"
        >
          Escanear outra carta
        </button>
      </div>
    </div>
  )
}

function NotFoundView({
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearching,
  results,
  added,
  isPending,
  onAdd,
  onView,
  onRetry,
}: {
  searchQuery: string
  setSearchQuery: (v: string) => void
  onSearch: (e: React.FormEvent) => void
  isSearching: boolean
  results: IdentifiedPokemon[] | null
  added: Set<string>
  isPending: boolean
  onAdd: (id: string) => void
  onView: (id: string) => void
  onRetry: () => void
}) {
  return (
    <div className="w-full bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
      <h3 className="text-red-500 font-bold text-lg mb-2 text-center">Não identificado</h3>
      <p className="text-center text-sm text-gray-500 mb-4">
        Não reconhecemos o Pokémon automaticamente. Busque pelo nome ou número.
      </p>

      <form onSubmit={onSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Nome ou número..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-poke-red"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button type="submit" disabled={isSearching} className="bg-poke-dark text-white p-3 rounded-xl">
          {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </button>
      </form>

      {results && results.length === 0 && (
        <p className="text-center text-sm text-gray-400 mb-4">Nenhum resultado.</p>
      )}

      {results && results.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {results.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-2"
            >
              {p.imageUrl && (
                <Image src={p.imageUrl} alt={p.name} width={40} height={40} className="w-10 h-10 object-contain" />
              )}
              <button onClick={() => onView(p.id)} className="flex-1 text-left min-w-0">
                <div className="text-xs font-mono text-gray-500">
                  #{String(p.pokedexNumber).padStart(4, '0')}
                </div>
                <div className="font-bold uppercase truncate">{p.name}</div>
              </button>
              <button
                onClick={() => onAdd(p.id)}
                disabled={isPending || added.has(p.id)}
                className={clsx(
                  'p-2 rounded-full text-white flex-shrink-0',
                  added.has(p.id) ? 'bg-green-500' : 'bg-poke-red',
                )}
              >
                {added.has(p.id) ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onRetry}
        className="w-full bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 py-3 rounded-full font-bold"
      >
        Tentar outra foto
      </button>
    </div>
  )
}
