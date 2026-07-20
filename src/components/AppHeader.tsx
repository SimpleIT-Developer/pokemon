'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function AppHeader({ title, backTo }: { title: string, backTo?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  
  const showBack = pathname !== '/' && pathname !== '/scanner'
  
  return (
    <header className="sticky top-0 z-40 bg-poke-red text-white shadow-md">
      <div className="flex items-center h-14 px-4 max-w-md mx-auto">
        {showBack && (
          <button 
            onClick={() => backTo ? router.push(backTo) : router.back()}
            className="p-2 -ml-2 mr-2 rounded-full hover:bg-black/10 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <h1 className="text-xl font-bold tracking-wide">{title}</h1>
      </div>
    </header>
  )
}
