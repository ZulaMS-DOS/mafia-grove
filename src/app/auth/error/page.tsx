'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const ERRORS: Record<string, { title: string; message: string; emoji: string; canRetry: boolean }> = {
  banned: {
    emoji:    '🚫',
    title:    'Acces Interzis',
    message:  'Ai fost banat de pe acest site. Contactează un Lider pentru mai multe informații.',
    canRetry: false,
  },
  not_in_guild: {
    emoji:    '❌',
    title:    'Nu ești pe server',
    message:  'Trebuie să fii membru al serverului Discord Bratkov Legacy pentru a accesa acest site.',
    canRetry: false,
  },
  bot_error: {
    emoji:    '🤖',
    title:    'Eroare Bot',
    message:  'A apărut o eroare la verificarea membriei. Încearcă din nou.',
    canRetry: true,
  },
  no_grade: {
    emoji:    '🔒',
    title:    'Grad Insuficient',
    message:  'Accesul este permis doar membrilor cu gradul de Muncitor sau superior. Contactează un Lider dacă crezi că este o greșeală.',
    canRetry: false,
  },
  OAuthCallback: {
    emoji:    '⏳',
    title:    'Rate Limit Discord',
    message:  'Discord a blocat temporar autentificarea din cauza prea multor încercări. Așteaptă câteva minute și încearcă din nou. Dacă problema persistă, șterge cookie-urile browserului.',
    canRetry: true,
  },
  AccessDenied: {
    emoji:    '🛑',
    title:    'Autentificare Anulată',
    message:  'Ai anulat procesul de autentificare. Trebuie să autorizezi aplicația pentru a te putea conecta.',
    canRetry: true,
  },
  default: {
    emoji:    '⚠️',
    title:    'Eroare Autentificare',
    message:  'A apărut o eroare la autentificare. Încearcă din nou.',
    canRetry: true,
  },
}

function ErrorContent() {
  const params  = useSearchParams()
  const error   = params.get('error') || 'default'
  const info    = ERRORS[error] || ERRORS.default
  const [countdown, setCountdown] = useState(info.canRetry ? 10 : 0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-8xl">{info.emoji}</div>
        <div>
          <h1 className="text-3xl font-black text-white mb-2">{info.title}</h1>
          <p className="text-zinc-500">{info.message}</p>
        </div>

        {error === 'OAuthCallback' && (
          <div className="p-4 bg-dark-card border border-yellow-500/20 rounded-xl text-left space-y-2">
            <p className="text-yellow-400 text-sm font-semibold">💡 Ce poți face:</p>
            <ul className="text-zinc-500 text-xs space-y-1">
              <li>• Șterge cookie-urile din browser (Ctrl+Shift+Del)</li>
              <li>• Deloghează-te din Discord și reloghează-te</li>
              <li>• Încearcă din alt browser sau mod incognito</li>
              <li>• Așteaptă 15-30 minute și încearcă din nou</li>
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3 items-center">
          {info.canRetry && (
            countdown > 0 ? (
              <div className="px-6 py-3 rounded-xl bg-dark-card border border-dark-border text-zinc-500 text-sm">
                Poți reîncerca în {countdown}s...
              </div>
            ) : (
              <Link href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-grove-green text-black font-bold hover:bg-grove-dark transition-colors">
                🔄 Încearcă din nou
              </Link>
            )
          )}
          <Link href="/auth/login"
            className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors">
            ← Înapoi la Login
          </Link>
        </div>
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
