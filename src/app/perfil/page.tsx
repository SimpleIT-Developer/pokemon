import AppHeader from '@/components/AppHeader'
import { User, Mail, Shield, Settings, LogOut } from 'lucide-react'

export default function PerfilPage() {
  return (
    <>
      <AppHeader title="Meu Perfil" backTo="/" />
      
      <div className="p-4 max-w-md mx-auto pb-24">
        <div className="bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm mb-6 flex flex-col items-center">
          <div className="w-24 h-24 bg-poke-red text-white rounded-full flex items-center justify-center mb-4 shadow-md">
            <User className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-poke-dark dark:text-white">Treinador(a)</h2>
          <p className="text-gray-500 font-medium">treinador@pokemon.com</p>
        </div>
        
        <div className="bg-white dark:bg-poke-dark border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
          <button className="w-full flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div className="text-left flex-1">
              <div className="font-bold">Alterar Email</div>
            </div>
          </button>
          
          <button className="w-full flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="p-2 bg-green-100 text-green-600 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-left flex-1">
              <div className="font-bold">Segurança e Senha</div>
            </div>
          </button>
          
          <button className="w-full flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div className="text-left flex-1">
              <div className="font-bold">Configurações do App</div>
            </div>
          </button>
          
          <button className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600">
            <div className="p-2 bg-red-100 rounded-xl">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="text-left flex-1">
              <div className="font-bold">Sair da conta</div>
            </div>
          </button>
        </div>
        
        <div className="text-center mt-8 text-sm text-gray-400 font-medium">
          Versão 1.0.0 MVP
        </div>
      </div>
    </>
  )
}
