'use client'

import { useState, useRef, useTransition } from 'react'
import AppHeader from '@/components/AppHeader'
import { Camera, Upload, RefreshCcw, Search, Check, Plus, Loader2, Eye, ChevronDown, AlertTriangle } from 'lucide-react'
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

interface Debug {
  rawText: string
  candidates: string[]
  confidence: number
}

export default function ScannerPage() {
  const [image, setImage] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<IdentifyResult | null>(null)
  const [debug, setDebug] = useState<Debug | null>(null)
  const [scanError, setScanError] = useState(false)
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
    setDebug(null)
    setScanError(false)
    setSearchQuery('')
    setSearchResults(null)
  }

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setImage(url)
    setResult(null)
    setDebug(null)
    setScanError(false)
    setSearchResults(null)
    processImage(url)
    e.target.value = ''
  }

  const processImage = async (url: string) => {
    try {
      setPhase('ocr')
      const ocr = await scanPokemonCard(url)
      setDebug({ rawText: ocr.rawText, candidates: ocr.candidates, confidence: ocr.confidence })

      setPhase('identifying')
      const res = await identifyCard({
        candidates: ocr.candidates,
        collectorNumber: ocr.collectorNumber,
      })
      setResult(res)
    } catch (error) {
      console.error('Scan failed', error)
      setScanError(true)
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
  const identified = result?.status === 'identified' || result?.status === 'uncertain'

  return (
    <>
      <AppHeader title="Scanner de Cartas" />

      <div className="p-4 max-w-md mx-auto pb-24">
        {!image ? (
          <CaptureArea onPick={() => fileInputRef.current?.click()} />
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-full aspect-[3/4] max-w-[300px] rounded-2xl overflow-hidden shadow-xl mb-6">
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

            {phase === 'done' && (
              <div className="w-full flex flex-col gap-4">
                {scanError && <ScanErrorCard onRetry={reset} />}

                {identified && result?.pokemon && (
                  <IdentifiedView
                    result={result}
                    added={added}
                    isPending={isPending}
                    onAdd={addToCollection}
                    onView={(id) => router.push(`/pokemon/${id}`)}
                  />
                )}

                {result?.status === 'not_found' && (
                  <NotFoundHeader hasSuggestions={(result.suggestions?.length ?? 0) > 0} />
                )}

                {/* Suggestions (uncertain or not_found) */}
                {result && result.status !== 'identified' && result.suggestions?.length > 0 && (
                  <SuggestionList
                    title="É algum destes?"
                    items={result.suggestions}
                    added={added}
                    isPending={isPending}
                    onAdd={addToCollection}
                    onView={(id) => router.push(`/pokemon/${id}`)}
                  />
                )}

                {/* Manual search always available when not confidently identified */}
                {(scanError || (result && result.status !== 'identified')) && (
                  <ManualSearch
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onSearch={handleSearch}
                    isSearching={isSearching}
                    results={searchResults}
                    added={added}
                    isPending={isPending}
                    onAdd={addToCollection}
                    onView={(id) => router.push(`/pokemon/${id}`)}
                  />
                )}

                {debug && <DebugBox debug={debug} />}

                <button onClick={reset} className="py-2 text-sm text-gray-500 font-medium">
                  Escanear outra carta
                </button>
              </div>
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
        Enquadre só a carta, com boa luz e o nome no topo bem legível.
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

function ScanErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm text-center">
      <AlertTriangle className="w-10 h-10 text-poke-red mx-auto mb-3" />
      <h3 className="font-bold text-lg mb-1">Falha ao ler a imagem</h3>
      <p className="text-sm text-gray-500 mb-4">
        Não foi possível processar a foto. Tente novamente ou busque manualmente abaixo.
      </p>
      <button onClick={onRetry} className="text-sm text-poke-red font-bold">
        Tentar outra foto
      </button>
    </div>
  )
}

function NotFoundHeader({ hasSuggestions }: { hasSuggestions: boolean }) {
  return (
    <div className="w-full bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm text-center">
      <h3 className="text-red-500 font-bold text-lg mb-1">Não identificado</h3>
      <p className="text-sm text-gray-500">
        {hasSuggestions
          ? 'Não temos certeza. Veja os palpites ou busque manualmente.'
          : 'Não reconhecemos o Pokémon. Busque pelo nome ou número.'}
      </p>
    </div>
  )
}

function IdentifiedView({
  result,
  added,
  isPending,
  onAdd,
  onView,
}: {
  result: IdentifyResult
  added: Set<string>
  isPending: boolean
  onAdd: (id: string) => void
  onView: (id: string) => void
}) {
  const p = result.pokemon!
  const card = result.card
  const uncertain = result.status === 'uncertain'
  const isAdded = added.has(p.id)

  return (
    <div className="w-full bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
      <h3
        className={clsx(
          'font-bold text-lg mb-4 text-center',
          uncertain ? 'text-amber-500' : 'text-green-500',
        )}
      >
        {uncertain ? 'Provavelmente é...' : 'Pokémon Identificado!'}
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
          <img src={card.image} alt={card.name} className="w-14 rounded-md shadow ml-auto flex-shrink-0" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => onAdd(p.id)}
          disabled={isPending || isAdded}
          className={clsx(
            'flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white shadow-md transition-all active:scale-95',
            isAdded ? 'bg-green-500' : 'bg-poke-red hover:bg-poke-red-dark',
          )}
        >
          {isPending && !isAdded ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isAdded ? (
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
          onClick={() => onView(p.id)}
          className="flex items-center justify-center gap-2 bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 py-3 rounded-full font-bold"
        >
          <Eye className="w-5 h-5" /> Ver Pokémon
        </button>
      </div>
    </div>
  )
}

function SuggestionList({
  title,
  items,
  added,
  isPending,
  onAdd,
  onView,
}: {
  title: string
  items: IdentifiedPokemon[]
  added: Set<string>
  isPending: boolean
  onAdd: (id: string) => void
  onView: (id: string) => void
}) {
  return (
    <div className="w-full bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-bold text-gray-500 mb-3 px-1">{title}</p>
      <div className="flex flex-col gap-2">
        {items.map((p) => (
          <PokemonRow
            key={p.id}
            p={p}
            added={added.has(p.id)}
            isPending={isPending}
            onAdd={() => onAdd(p.id)}
            onView={() => onView(p.id)}
          />
        ))}
      </div>
    </div>
  )
}

function PokemonRow({
  p,
  added,
  isPending,
  onAdd,
  onView,
}: {
  p: IdentifiedPokemon
  added: boolean
  isPending: boolean
  onAdd: () => void
  onView: () => void
}) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-2">
      {p.imageUrl && (
        <Image src={p.imageUrl} alt={p.name} width={40} height={40} className="w-10 h-10 object-contain" />
      )}
      <button onClick={onView} className="flex-1 text-left min-w-0">
        <div className="text-xs font-mono text-gray-500">#{String(p.pokedexNumber).padStart(4, '0')}</div>
        <div className="font-bold uppercase truncate">{p.name}</div>
      </button>
      <button
        onClick={onAdd}
        disabled={isPending || added}
        className={clsx('p-2 rounded-full text-white flex-shrink-0', added ? 'bg-green-500' : 'bg-poke-red')}
      >
        {added ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>
    </div>
  )
}

function ManualSearch({
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearching,
  results,
  added,
  isPending,
  onAdd,
  onView,
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
}) {
  return (
    <div className="w-full bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou número..."
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
        <p className="text-center text-sm text-gray-400 mt-3">Nenhum resultado.</p>
      )}

      {results && results.length > 0 && (
        <div className="flex flex-col gap-2 mt-3">
          {results.map((p) => (
            <PokemonRow
              key={p.id}
              p={p}
              added={added.has(p.id)}
              isPending={isPending}
              onAdd={() => onAdd(p.id)}
              onView={() => onView(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DebugBox({ debug }: { debug: Debug }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="w-full">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-400 font-medium mx-auto"
      >
        <ChevronDown className={clsx('w-4 h-4 transition-transform', open && 'rotate-180')} />
        O que o scanner leu
      </button>
      {open && (
        <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs text-gray-500 space-y-2">
          <div>
            <span className="font-bold">Confiança OCR:</span> {Math.round(debug.confidence)}%
          </div>
          <div>
            <span className="font-bold">Candidatos:</span>{' '}
            {debug.candidates.length ? debug.candidates.join(', ') : '(nenhum)'}
          </div>
          <div>
            <span className="font-bold">Texto lido:</span>
            <pre className="whitespace-pre-wrap break-words mt-1 font-mono">
              {debug.rawText || '(vazio)'}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
