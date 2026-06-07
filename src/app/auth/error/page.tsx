'use client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const errors: Record<string, { title: string; desc: string }> = {
  not_in_guild: {
    title: 'Nu ai acces',
    desc:  'Nu ești pe serverul Discord Mafia Grove. Cere o invitație unui admin.',
  },
  bot_error: {
    title: 'Eroare verificare',
    desc:  'Nu s-a putut verifica apartenența la server. Încearcă din nou.',
  },
  default: {
    title: 'Eroare autentificare',
    desc:  'A apărut o eroare la autentificare. Încearcă din nou.',
  },
}

export default function AuthErrorPage() {
  const params = useSearchParams()
  const errKey = params.get('error') || 'default'
  const err    = errors[errKey] || errors.default

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center px-6 animate-slide-up">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-3xl font-black text-red-500 mb-3">{err.title}</h1>
        <p className="text-zinc-400 mb-8 max-w-sm mx-auto">{err.desc}</p>
        <Link href="/auth/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                     border border-dark-border text-zinc-400 hover:text-white
                     hover:border-grove-border transition-all duration-200">
          ← Înapoi la login
        </Link>
      </div>
    </div>
  )
}
