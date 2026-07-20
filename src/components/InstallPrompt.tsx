'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

// Chrome/Edge fire `beforeinstallprompt` instead of showing an automatic
// banner. We capture it and expose our own button so the install action is
// discoverable rather than hidden in the address bar.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!deferred || dismissed) return null

  const install = async () => {
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setDeferred(null)
    else setDismissed(true)
  }

  return (
    <div className="fixed bottom-24 inset-x-4 z-50 flex items-center gap-3 bg-poke-red text-white px-4 py-3 rounded-2xl shadow-lg max-w-md mx-auto">
      <Download className="w-6 h-6 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm leading-tight">Instalar Pokédex</p>
        <p className="text-xs opacity-90 leading-tight">Use como um app na tela inicial.</p>
      </div>
      <button onClick={install} className="bg-white text-poke-red font-bold px-4 py-2 rounded-full text-sm flex-shrink-0">
        Instalar
      </button>
      <button onClick={() => setDismissed(true)} aria-label="Fechar" className="p-1 flex-shrink-0">
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}
