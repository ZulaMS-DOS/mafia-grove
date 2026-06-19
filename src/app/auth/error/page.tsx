'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const ERRORS: Record<string, { title: string; message: string; emoji: string }> = {
  banned: {
    emoji:   '🚫',
    title:   'Acces Interzis',
    message: 'Ai fost banat de pe acest site. Contactează un Lider pentru mai multe informații.',
  },
  not_in_guild: {
    emoji:   '❌',
    title:   'Nu ești pe server',
    message: 'Trebuie să fii membru al serverului Discord Mafia Grove pentru a accesa acest site.',
  },
  bot_error: {
    emoji:   '🤖',
    title:   'Eroare Bot',
    message: 'A apărut o eroare la verificarea membriei. Încearcă din nou.',
  },
  no_grade: {
    emoji:   '🔒',
    title:   'Grad Insuficient',
    message: 'Accesul este permis doar membrilor cu gradul de Muncitor sau superior. Contactează un Lider dacă crezi că este o greșeală.',
  },
  default: {
    emoji:   '⚠️',
    title:   'Eroare Autentificare',
    message: 'A apărut o eroare la autentificare. Încearcă din nou.',
  },
}

function ErrorContent() {
  const params = useSearchParams()
  const error  = params.get('error') || 'default'
  const info   = ERRORS[error] || ERRORS.default

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-8xl">{info.emoji}</div>
        <div>
          <h1 className="text-3xl font-black text-white mb-2">{info.title}</h1>
          <p className="text-zinc-500">{info.message}</p>
        </div>
        <Link href="/auth/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-grove-green text-black font-bold hover:bg-grove-dark transition-colors">
          ← Înapoi la Login
        </Link>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-600">Se încarcă...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
