import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface GenerationCardProps {
  gen: number
  start: number
  end: number
  found: number
  total: number
}

export default function GenerationCard({ gen, start, end, found, total }: GenerationCardProps) {
  const percentage = Math.round((found / total) * 100) || 0
  
  return (
    <Link href={`/pokedex/${gen}`} className="block">
      <div className="bg-white dark:bg-poke-dark border border-poke-gray dark:border-gray-700 rounded-xl p-4 shadow-sm active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-lg">{gen}ª Geração</h3>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
        <div className="text-sm text-gray-500 mb-3 font-mono">
          #{String(start).padStart(4, '0')} a #{String(end).padStart(4, '0')}
        </div>
        
        <div className="flex justify-between items-end mb-1 text-sm">
          <span className="font-medium text-poke-dark dark:text-gray-200">
            {found} <span className="text-gray-400 font-normal">de {total}</span>
          </span>
          <span className="font-bold text-poke-blue">{percentage}%</span>
        </div>
        
        <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-poke-blue transition-all duration-500 ease-out rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </Link>
  )
}
