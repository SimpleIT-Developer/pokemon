import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="p-4 max-w-md mx-auto min-h-screen flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-full flex items-center justify-center mb-6">
        <WifiOff className="w-12 h-12" />
      </div>
      <h1 className="text-2xl font-black text-poke-dark dark:text-white mb-2">
        Você está offline
      </h1>
      <p className="text-gray-500 font-medium">
        Sua coleção precisa de conexão para carregar. Verifique a internet e tente novamente.
      </p>
    </div>
  )
}
