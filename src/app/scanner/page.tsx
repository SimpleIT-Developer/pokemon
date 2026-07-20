'use client'

import { useState, useRef } from 'react'
import AppHeader from '@/components/AppHeader'
import { Camera, Upload, RefreshCcw, Search } from 'lucide-react'
import { scanPokemonCard, ScanResult } from '@/services/card-scanner'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

export default function ScannerPage() {
  const [image, setImage] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    setImage(url)
    setScanResult(null)
    processImage(url)
  }

  const processImage = async (url: string) => {
    setIsScanning(true)
    const result = await scanPokemonCard(url)
    setScanResult(result)
    setIsScanning(false)
    
    // If we confidently found a number, we could auto redirect or suggest it
    // For MVP, we'll just show it to the user and let them search or confirm
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // In a real app we'd query the DB via an API.
      // We can also redirect to a search results page or directly to the pokemon page if it's a number
      if (!isNaN(Number(searchQuery))) {
        // We'll need the ID instead of pokedexNumber. 
        // For MVP, we assume we have an API or Server Action to find by number.
        // Let's redirect to a search page or we could just add an action.
        alert('Busca implementada no próximo passo: ' + searchQuery)
      }
    }
  }

  return (
    <>
      <AppHeader title="Scanner de Cartas" />
      
      <div className="p-4 max-w-md mx-auto pb-24">
        {!image ? (
          <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-poke-gray dark:border-gray-700 rounded-3xl bg-gray-50 dark:bg-gray-800/50 relative overflow-hidden">
            <div className="absolute inset-8 border-2 border-poke-blue/30 rounded-xl pointer-events-none" />
            
            <Camera className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-500 font-medium text-center px-8 mb-6">
              Posicione o card dentro da área.
              Garantir boa iluminação.
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-poke-red text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-poke-red-dark active:scale-95 transition-all"
              >
                <Camera className="w-5 h-5" />
                Câmera
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-white dark:bg-poke-dark text-poke-dark dark:text-white border border-gray-200 dark:border-gray-700 px-6 py-3 rounded-full font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all"
              >
                <Upload className="w-5 h-5" />
                Galeria
              </button>
            </div>
            
            <input 
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageCapture}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-full aspect-[3/4] max-w-[300px] rounded-2xl overflow-hidden shadow-xl mb-6">
              <Image src={image} alt="Card Scan" fill className="object-cover" />
              {isScanning && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                  <RefreshCcw className="w-10 h-10 animate-spin mb-4" />
                  <p className="font-bold text-lg animate-pulse">Processando imagem...</p>
                </div>
              )}
            </div>

            {!isScanning && scanResult && (
              <div className="w-full bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
                {(scanResult.pokedexNumber || scanResult.pokemonName) ? (
                  <>
                    <h3 className="text-green-500 font-bold text-lg mb-2 text-center">Pokémon Identificado!</h3>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center mb-4">
                      {scanResult.pokedexNumber && (
                        <div className="text-xl font-mono text-gray-500">#{String(scanResult.pokedexNumber).padStart(4, '0')}</div>
                      )}
                      {scanResult.pokemonName && (
                        <div className="text-2xl font-black uppercase text-poke-dark dark:text-white">{scanResult.pokemonName}</div>
                      )}
                    </div>
                    
                    <p className="text-center text-sm font-medium text-gray-500 mb-4">É este Pokémon?</p>
                    
                    <div className="flex flex-col gap-2">
                      <button className="bg-poke-red text-white py-3 rounded-full font-bold shadow-md">
                        Sim, ver Pokémon
                      </button>
                      <button 
                        onClick={() => setImage(null)}
                        className="bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 py-3 rounded-full font-bold"
                      >
                        Não, tentar novamente
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-red-500 font-bold text-lg mb-2 text-center">Não identificado</h3>
                    <p className="text-center text-sm text-gray-500 mb-4">Não conseguimos identificar o Pokémon automaticamente.</p>
                    
                    <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Pesquisar por nome ou número..."
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-poke-red"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="bg-poke-dark text-white p-3 rounded-xl">
                        <Search className="w-5 h-5" />
                      </button>
                    </form>
                    
                    <button 
                      onClick={() => setImage(null)}
                      className="w-full bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 py-3 rounded-full font-bold"
                    >
                      Tentar outra foto
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
