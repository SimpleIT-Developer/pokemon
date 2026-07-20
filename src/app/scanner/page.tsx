'use client'

import { useState, useRef, useTransition } from 'react'
import AppHeader from '@/components/AppHeader'
import {
  Camera,
  Upload,
  RefreshCcw,
  Search,
  Check,
  Plus,
  Loader2,
  Eye,
  ChevronDown,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react'
import { scanPokemonCard } from '@/services/card-scanner'
import {
  identifyCard,
  searchPokemon,
  getCardsForPokemon,
  type IdentifyResult,
  type IdentifiedPokemon,
  type CardOption,
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
  const [manualMode, setManualMode] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<IdentifyResult | null>(null)
  const [debug, setDebug] = useState<Debug | null>(null)
  const [scanError, setScanError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<IdentifiedPokemon[] | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [actionError, setActionError] = useState<string | null>(null)

  // Step 2: card selection for a chosen Pokémon.
  const [selected, setSelected] = useState<IdentifiedPokemon | null>(null)
  const [cards, setCards] = useState<CardOption[] | null>(null)
  const [chosenCardId, setChosenCardId] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const [isSearching, startSearch] = useTransition()
  const [isLoadingCards, startCards] = useTransition()
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
    setSelected(null)
    setCards(null)
    setChosenCardId(null)
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
    setSelected(null)
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
      mergeOwned([res.pokemon, ...(res.suggestions ?? [])])
    } catch (error) {
      console.error('Scan failed', error)
      setScanError(true)
    } finally {
      setPhase('done')
    }
  }

  // Reflect already-owned Pokémon (from the DB) in the same set used for the
  // just-added ones, so the UI shows "Na coleção" for both.
  const mergeOwned = (list: (IdentifiedPokemon | undefined)[]) => {
    const ids = list.filter((p): p is IdentifiedPokemon => !!p && p.owned).map((p) => p.id)
    if (ids.length) setAdded((prev) => new Set([...prev, ...ids]))
  }

  // Step 1 → 2: user picked a Pokémon; load its cards from the API.
  const pickPokemon = (p: IdentifiedPokemon) => {
    setSelected(p)
    setChosenCardId(null)
    setCards(null)
    startCards(async () => {
      setCards(await getCardsForPokemon(p.pokedexNumber))
    })
  }

  const quickAdd = (pokemonId: string) => {
    setActionError(null)
    startTransition(async () => {
      const r = await togglePokemonInCollection(pokemonId, false)
      if (r.success) setAdded((prev) => new Set(prev).add(pokemonId))
      else setActionError(r.error ?? 'Não foi possível adicionar à coleção.')
    })
  }

  // Step 2: user picked the exact card. Marks the Pokémon owned; the specific
  // card id is kept for the confirmation highlight.
  const pickCard = (card: CardOption) => {
    if (!selected) return
    setActionError(null)
    startTransition(async () => {
      const r = await togglePokemonInCollection(selected.id, false)
      if (r.success) {
        setAdded((prev) => new Set(prev).add(selected.id))
        setChosenCardId(card.id)
      } else {
        setActionError(r.error ?? 'Não foi possível adicionar à coleção.')
      }
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    startSearch(async () => {
      const r = await searchPokemon(q)
      setSearchResults(r)
      mergeOwned(r)
    })
  }

  const busy = phase === 'ocr' || phase === 'identifying'
  const identified = result?.status === 'identified' || result?.status === 'uncertain'

  return (
    <>
      <AppHeader title="Scanner de Cartas" />

      <div className="p-4 max-w-md mx-auto pb-24">
        {actionError && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 rounded-xl p-3 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {actionError}
          </div>
        )}
        {selected ? (
          <CardPicker
            pokemon={selected}
            cards={cards}
            loading={isLoadingCards}
            chosenCardId={chosenCardId}
            isPending={isPending}
            owned={added.has(selected.id)}
            onPickCard={pickCard}
            onAddWithoutCard={() => quickAdd(selected.id)}
            onRetry={() => pickPokemon(selected)}
            onView={() => router.push(`/pokemon/${selected.id}`)}
            onBack={() => {
              setSelected(null)
              setCards(null)
              setChosenCardId(null)
            }}
          />
        ) : !image ? (
          <div className="flex flex-col gap-4">
            <CaptureArea
              onPick={() => fileInputRef.current?.click()}
              onManual={() => {
                setSearchResults(null)
                setManualMode((v) => !v)
              }}
              manualOpen={manualMode}
            />
            {manualMode && (
              <ManualSearch
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearch={handleSearch}
                isSearching={isSearching}
                results={searchResults}
                added={added}
                isPending={isPending}
                onPick={pickPokemon}
                onQuickAdd={quickAdd}
              />
            )}
          </div>
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
                    owned={added.has(result.pokemon.id)}
                    isPending={isPending}
                    onPick={() => pickPokemon(result.pokemon!)}
                    onQuickAdd={() => quickAdd(result.pokemon!.id)}
                    onView={() => router.push(`/pokemon/${result.pokemon!.id}`)}
                  />
                )}

                {result?.status === 'not_found' && (
                  <NotFoundHeader hasSuggestions={(result.suggestions?.length ?? 0) > 0} />
                )}

                {result && result.status !== 'identified' && result.suggestions?.length > 0 && (
                  <SuggestionList
                    title="É algum destes?"
                    items={result.suggestions}
                    added={added}
                    isPending={isPending}
                    onPick={pickPokemon}
                    onQuickAdd={quickAdd}
                  />
                )}

                {(scanError || (result && result.status !== 'identified')) && (
                  <ManualSearch
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onSearch={handleSearch}
                    isSearching={isSearching}
                    results={searchResults}
                    added={added}
                    isPending={isPending}
                    onPick={pickPokemon}
                    onQuickAdd={quickAdd}
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

function CaptureArea({
  onPick,
  onManual,
  manualOpen,
}: {
  onPick: () => void
  onManual: () => void
  manualOpen: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 border-2 border-dashed border-poke-gray dark:border-gray-700 rounded-3xl bg-gray-50 dark:bg-gray-800/50 relative overflow-hidden py-8">
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
      <button
        onClick={onManual}
        className="mt-6 flex items-center gap-1 text-sm text-poke-blue font-bold underline underline-offset-2"
      >
        <Search className="w-4 h-4" />
        {manualOpen ? 'Fechar busca manual' : 'Adicionar pelo número ou nome'}
      </button>
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
          ? 'Não temos certeza. Escolha um palpite ou busque manualmente.'
          : 'Não reconhecemos o Pokémon. Busque pelo nome ou número.'}
      </p>
    </div>
  )
}

function IdentifiedView({
  result,
  owned,
  isPending,
  onPick,
  onQuickAdd,
  onView,
}: {
  result: IdentifyResult
  owned: boolean
  isPending: boolean
  onPick: () => void
  onQuickAdd: () => void
  onView: () => void
}) {
  const p = result.pokemon!
  const uncertain = result.status === 'uncertain'

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
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onPick}
          className="flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white bg-poke-red hover:bg-poke-red-dark shadow-md transition-all active:scale-95"
        >
          <Search className="w-5 h-5" /> Escolher a carta
        </button>
        <button
          onClick={onQuickAdd}
          disabled={isPending || owned}
          className={clsx(
            'flex items-center justify-center gap-2 py-3 rounded-full font-bold border transition-all',
            owned
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-white dark:bg-poke-dark border-gray-200 dark:border-gray-700',
          )}
        >
          {owned ? (
            <>
              <Check className="w-5 h-5" /> Na coleção
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" /> Adicionar sem escolher carta
            </>
          )}
        </button>
        <button onClick={onView} className="py-2 text-sm text-gray-500 font-medium flex items-center justify-center gap-1">
          <Eye className="w-4 h-4" /> Ver Pokémon
        </button>
      </div>
    </div>
  )
}

function CardPicker({
  pokemon,
  cards,
  loading,
  chosenCardId,
  isPending,
  owned,
  onPickCard,
  onAddWithoutCard,
  onRetry,
  onView,
  onBack,
}: {
  pokemon: IdentifiedPokemon
  cards: CardOption[] | null
  loading: boolean
  chosenCardId: string | null
  isPending: boolean
  owned: boolean
  onPickCard: (card: CardOption) => void
  onAddWithoutCard: () => void
  onRetry: () => void
  onView: () => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 font-bold self-start">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex items-center gap-4 bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
        {pokemon.imageUrl && (
          <Image
            src={pokemon.imageUrl}
            alt={pokemon.name}
            width={56}
            height={56}
            className="w-14 h-14 object-contain flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <div className="text-xs font-mono text-gray-500">
            #{String(pokemon.pokedexNumber).padStart(4, '0')}
          </div>
          <div className="text-xl font-black uppercase truncate">{pokemon.name}</div>
        </div>
        {owned && (
          <span className="ml-auto flex items-center gap-1 text-green-500 font-bold text-sm">
            <Check className="w-4 h-4" /> Adicionado
          </span>
        )}
      </div>

      <p className="text-sm font-bold text-gray-500 px-1">
        {owned ? 'Carta marcada. Toque em outra para trocar.' : 'Qual carta você tem?'}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-poke-red" />
        </div>
      ) : cards && cards.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => onPickCard(card)}
              disabled={isPending}
              className={clsx(
                'relative rounded-lg overflow-hidden border-2 transition-all active:scale-95',
                chosenCardId === card.id ? 'border-green-500 ring-2 ring-green-500' : 'border-transparent',
              )}
              title={`${card.setName} · ${card.number}${card.rarity ? ` · ${card.rarity}` : ''}`}
            >
              {card.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={card.image} alt={`${card.name} ${card.setName}`} className="w-full aspect-[3/4] object-cover" />
              ) : (
                <div className="w-full aspect-[3/4] bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-400 p-1 text-center">
                  {card.setName} {card.number}
                </div>
              )}
              {chosenCardId === card.id && (
                <span className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 mb-3">
            Nenhuma carta veio da base. Pode ser lentidão momentânea da API.
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 text-sm text-poke-red font-bold"
          >
            <RefreshCcw className="w-4 h-4" /> Tentar novamente
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-2">
        {!owned && (
          <button
            onClick={onAddWithoutCard}
            disabled={isPending}
            className="flex items-center justify-center gap-2 py-3 rounded-full font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-poke-dark"
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Adicionar sem carta específica
          </button>
        )}
        {owned && (
          <button
            onClick={onView}
            className="flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white bg-poke-red"
          >
            <Eye className="w-5 h-5" /> Ver Pokémon
          </button>
        )}
      </div>
    </div>
  )
}

function SuggestionList({
  title,
  items,
  added,
  isPending,
  onPick,
  onQuickAdd,
}: {
  title: string
  items: IdentifiedPokemon[]
  added: Set<string>
  isPending: boolean
  onPick: (p: IdentifiedPokemon) => void
  onQuickAdd: (id: string) => void
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
            onPick={() => onPick(p)}
            onQuickAdd={() => onQuickAdd(p.id)}
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
  onPick,
  onQuickAdd,
}: {
  p: IdentifiedPokemon
  added: boolean
  isPending: boolean
  onPick: () => void
  onQuickAdd: () => void
}) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-2">
      {p.imageUrl && (
        <Image src={p.imageUrl} alt={p.name} width={40} height={40} className="w-10 h-10 object-contain flex-shrink-0" />
      )}
      <button onClick={onPick} className="flex-1 text-left min-w-0">
        <div className="text-xs font-mono text-gray-500">#{String(p.pokedexNumber).padStart(4, '0')}</div>
        <div className="font-bold uppercase truncate">{p.name}</div>
        <div className="text-xs text-poke-blue font-medium">Escolher a carta →</div>
      </button>
      <button
        onClick={onQuickAdd}
        disabled={isPending || added}
        title="Adicionar sem escolher carta"
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
  onPick,
  onQuickAdd,
}: {
  searchQuery: string
  setSearchQuery: (v: string) => void
  onSearch: (e: React.FormEvent) => void
  isSearching: boolean
  results: IdentifiedPokemon[] | null
  added: Set<string>
  isPending: boolean
  onPick: (p: IdentifiedPokemon) => void
  onQuickAdd: (id: string) => void
}) {
  return (
    <div className="w-full bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            inputMode="text"
            placeholder="Nome ou número (ex.: 25)..."
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
              onPick={() => onPick(p)}
              onQuickAdd={() => onQuickAdd(p.id)}
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
