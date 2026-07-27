'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Check, Plus, Loader2, Search, CameraOff } from 'lucide-react'
import Image from 'next/image'
import clsx from 'clsx'
import { scanVideoFrame, terminateScanner } from '@/services/card-scanner'
import { bestMatch } from '@/lib/similarity'
import { getPokedex, type IdentifiedPokemon } from '@/app/actions/scan'

type Detected = IdentifiedPokemon & { score: number }

const SCAN_INTERVAL = 900 // ms between frame scans
const MATCH_THRESHOLD = 0.62

export default function LiveScanner({
  onClose,
  onPick,
  onQuickAdd,
  added,
  isPending,
}: {
  onClose: () => void
  onPick: (p: IdentifiedPokemon) => void
  onQuickAdd: (id: string) => void
  added: Set<string>
  isPending: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pokedexRef = useRef<IdentifiedPokemon[]>([])
  const runningRef = useRef(true)
  const processingRef = useRef(false)

  const [detected, setDetected] = useState<Detected | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    runningRef.current = true

    const tick = async () => {
      if (!runningRef.current) return
      const video = videoRef.current
      if (!processingRef.current && video && pokedexRef.current.length) {
        processingRef.current = true
        try {
          const ocr = await scanVideoFrame(video)
          if (ocr.candidates.length) {
            const m = bestMatch(ocr.candidates, pokedexRef.current, MATCH_THRESHOLD)
            if (m) setDetected({ ...(m.item as IdentifiedPokemon), score: m.score })
          }
        } catch {
          // ignore a bad frame and keep scanning
        }
        processingRef.current = false
      }
      if (runningRef.current) setTimeout(tick, SCAN_INTERVAL)
    }

    const init = async () => {
      try {
        // Load the catalog once; frames are matched against it on the client.
        pokedexRef.current = await getPokedex()

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setReady(true)
        tick()
      } catch (e) {
        const err = e as Error
        if (err.name === 'NotAllowedError') {
          setError('Permissão da câmera negada. Autorize o acesso e tente de novo.')
        } else if (err.name === 'NotFoundError') {
          setError('Nenhuma câmera encontrada neste dispositivo.')
        } else {
          setError('Não foi possível abrir a câmera.')
        }
      }
    }

    init()

    return () => {
      runningRef.current = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      terminateScanner()
    }
  }, [])

  const owned = detected ? added.has(detected.id) || detected.owned : false

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Camera */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Framing guide */}
      {ready && !error && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[70%] aspect-[3/4] border-2 border-white/70 rounded-2xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.35)]" />
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center bg-black/40 text-white rounded-full backdrop-blur"
          aria-label="Fechar"
        >
          <X className="w-6 h-6" />
        </button>
        {ready && !error && (
          <div className="flex items-center gap-2 bg-black/40 text-white text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Escaneando...
          </div>
        )}
      </div>

      {/* States */}
      {error ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center text-white p-8">
          <CameraOff className="w-14 h-14 mb-4 opacity-80" />
          <p className="font-bold text-lg mb-2">Câmera indisponível</p>
          <p className="text-white/80 mb-6">{error}</p>
          <button onClick={onClose} className="bg-white text-poke-dark font-bold px-6 py-3 rounded-full">
            Voltar
          </button>
        </div>
      ) : !ready ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-white">
          <Loader2 className="w-10 h-10 animate-spin mb-3" />
          <p className="font-medium">Abrindo câmera...</p>
        </div>
      ) : (
        <div className="relative z-10 mt-auto p-4">
          {detected ? (
            <div className="bg-white dark:bg-poke-dark rounded-2xl p-4 shadow-xl max-w-md mx-auto">
              <div className="flex items-center gap-4 mb-3">
                {detected.imageUrl && (
                  <Image
                    src={detected.imageUrl}
                    alt={detected.name}
                    width={56}
                    height={56}
                    className="w-14 h-14 object-contain flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-gray-500">
                    #{String(detected.pokedexNumber).padStart(4, '0')}
                  </div>
                  <div className="text-xl font-black uppercase truncate">{detected.name}</div>
                </div>
                {owned && (
                  <span className="flex items-center gap-1 text-green-500 font-bold text-sm flex-shrink-0">
                    <Check className="w-4 h-4" /> Tenho
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onQuickAdd(detected.id)}
                  disabled={isPending || owned}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-white transition-all active:scale-95',
                    owned ? 'bg-green-500' : 'bg-poke-red',
                  )}
                >
                  {isPending && !owned ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : owned ? (
                    <>
                      <Check className="w-5 h-5" /> Na coleção
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" /> Adicionar
                    </>
                  )}
                </button>
                <button
                  onClick={() => onPick(detected)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-full font-bold border border-gray-200 dark:border-gray-700"
                >
                  <Search className="w-5 h-5" /> Carta
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-black/50 text-white text-center rounded-2xl p-4 max-w-md mx-auto backdrop-blur">
              <p className="font-medium">Aponte para o nome da carta, reto e com boa luz.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
