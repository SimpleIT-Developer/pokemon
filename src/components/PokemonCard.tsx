import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'

interface PokemonCardProps {
  id: string
  pokedexNumber: number
  name: string
  imageUrl: string | null
  owned?: boolean
}

export default function PokemonCard({ id, pokedexNumber, name, imageUrl, owned }: PokemonCardProps) {
  const formattedNumber = String(pokedexNumber).padStart(4, '0')
  
  return (
    <Link href={`/pokemon/${id}`} className="block">
      <div className={clsx(
        "relative flex flex-col items-center p-3 rounded-2xl border bg-white dark:bg-poke-dark shadow-sm transition-transform active:scale-95",
        owned ? "border-green-500" : "border-poke-gray dark:border-gray-700"
      )}>
        {owned && (
          <div className="absolute top-2 right-2 text-green-500 bg-white rounded-full">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        )}
        <div className="w-full aspect-square relative mb-2">
          {imageUrl ? (
            <Image 
              src={imageUrl}
              alt={name}
              fill
              className={clsx(
                "object-contain p-2",
                !owned && "opacity-60 grayscale-[0.3]"
              )}
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 rounded-xl animate-pulse" />
          )}
        </div>
        <div className="text-center w-full">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono block">
            #{formattedNumber}
          </span>
          <span className={clsx(
            "font-semibold text-sm truncate block mt-0.5",
            !owned && "text-gray-600 dark:text-gray-300"
          )}>
            {name}
          </span>
        </div>
      </div>
    </Link>
  )
}
