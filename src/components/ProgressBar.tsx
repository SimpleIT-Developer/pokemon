interface ProgressBarProps {
  found: number
  total: number
  label?: string
}

export default function ProgressBar({ found, total, label = 'Progresso' }: ProgressBarProps) {
  const percentage = Math.round((found / total) * 100) || 0
  
  return (
    <div className="bg-white dark:bg-poke-dark border border-poke-gray dark:border-gray-700 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-end mb-2">
        <h2 className="font-bold text-gray-700 dark:text-gray-300">{label}</h2>
        <span className="font-bold text-poke-blue text-lg">{percentage}%</span>
      </div>
      
      <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div 
          className="h-full bg-poke-blue transition-all duration-700 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="text-sm text-gray-500 font-medium">
        {found} de {total} encontrados
      </div>
    </div>
  )
}
