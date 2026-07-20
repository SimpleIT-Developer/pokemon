'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Book, Camera, FolderHeart, User } from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/pokedex', label: 'Pokédex', icon: Book },
  { href: '/scanner', label: 'Scanner', icon: Camera, main: true },
  { href: '/colecao', label: 'Coleção', icon: FolderHeart },
  { href: '/perfil', label: 'Perfil', icon: User },
]

export default function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-poke-dark border-t border-poke-gray pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto relative px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          const Icon = item.icon
          
          if (item.main) {
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className="relative -top-5 flex flex-col items-center justify-center w-16 h-16 rounded-full bg-poke-red text-white shadow-lg ring-4 ring-white dark:ring-poke-dark"
              >
                <Icon className="w-8 h-8" />
                <span className="sr-only">{item.label}</span>
              </Link>
            )
          }
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors",
                isActive ? "text-poke-red" : "text-gray-500 dark:text-gray-400 hover:text-poke-red-dark"
              )}
            >
              <Icon className={clsx("w-6 h-6", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
