'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    await signIn('discord', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,#ffffff08,transparent)]" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(#ffffff05_1px,transparent_1px),linear-gradient(90deg,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative z-10 text-center px-6 animate-slide-up">
        {/* Logo */}
        <div className="mb-8">
          <div className="relative inline-block">
            <div className="absolute -inset-x-8 -inset-y-4 opacity-10 blur-2xl bg-white rounded-full" />
            <h1
              className="relative text-6xl sm:text-7xl leading-none tracking-wide select-none"
              style={{ fontFamily: 'var(--font-bangers), cursive' }}
            >
              <span
                className="block text-white"
                style={{
                  WebkitTextStroke: '1px rgba(255,255,255,0.3)',
                  textShadow: '0 0 40px rgba(255,255,255,0.15)',
                }}
              >
                BRATKOV
              </span>
              <span
                className="block -mt-2 text-white"
                style={{
                  WebkitTextStroke: '1px rgba(255,255,255,0.1)',
                  textShadow: '0 0 60px rgba(255,255,255,0.1)',
                  opacity: 0.7,
                }}
              >
                LEGACY
              </span>
            </h1>
          </div>
          <p className="text-zinc-600 text-sm tracking-[0.3em] uppercase mt-4">Organization Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 max-w-sm mx-auto shadow-[0_0_60px_#00000080]">
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
              Autentificare cu Discord
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
              Verificare membership server
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
              Acces bazat pe roluri Discord
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl
                       bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold
                       transition-all duration-200 hover:shadow-[0_0_20px_#5865F250]
                       disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.96 13.96 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
            )}
            {loading ? 'Se verifică...' : 'Login cu Discord'}
          </button>
        </div>

        <p className="mt-6 text-zinc-700 text-xs">
          Accesul este restricționat la membrii serverului Bratkov Legacy
        </p>
      </div>
    </div>
  )
}
