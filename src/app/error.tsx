'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 text-poke-red rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-12 h-12" />
      </div>

      <h1 className="text-2xl font-black text-poke-dark dark:text-white mb-2">
        Algo deu errado
      </h1>
      <p className="text-gray-500 font-medium mb-6">
        Não foi possível carregar seus dados. Tente novamente em instantes.
      </p>

      {error.digest && (
        <p className="text-xs text-gray-400 font-mono mb-6">
          Código: {error.digest}
        </p>
      )}

      <button
        onClick={reset}
        className="flex items-center gap-2 bg-poke-red text-white font-bold px-6 py-3 rounded-2xl shadow-md hover:opacity-90 transition-opacity"
      >
        <RotateCw className="w-5 h-5" />
        Tentar novamente
      </button>
    </div>
  )
}
