'use client'
import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import Image from 'next/image'

interface ActiveSession {
  id: string
  clockIn: string
  username: string
  avatar: string | null
  discordId: string
}

function useElapsed(clockIn: string) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(clockIn).getTime()) / 1000)
      const h    = Math.floor(diff / 3600)
      const m    = Math.floor((diff % 3600) / 60)
      const s    = diff % 60
      setElapsed(
        h > 0
          ? `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
          : `${m}m ${s.toString().padStart(2, '0')}s`
      )
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [clockIn])

  return elapsed
}

function SessionRow({ s }: { s: ActiveSession }) {
  const elapsed = useElapsed(s.clockIn)

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-dark-hover transition-colors">
      <div className="w-9 h-9 rounded-full border-2 border-grove-border overflow-hidden shrink-0 bg-dark-muted flex items-center justify-center">
        {s.avatar
          ? <Image src={s.avatar} alt={s.username} width={36} height={36} className="object-cover" unoptimized />
          : <span className="text-sm">👤</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold truncate">{s.username}</div>
        <div className="text-xs text-zinc-500">
          Clock-in: {new Date(s.clockIn).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-2 h-2 rounded-full bg-grove-green animate-pulse" />
        <span className="text-grove-green font-mono text-sm font-bold">{elapsed}</span>
      </div>
    </div>
  )
}

export function ActiveClockIns({ sessions }: { sessions: ActiveSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="grove-card">
        <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-3 flex items-center gap-2">
          <Clock size={14} /> Clock-In Activ
        </h2>
        <p className="text-zinc-600 text-sm text-center py-4">Niciun membru cu clock-in activ momentan.</p>
      </div>
    )
  }

  return (
    <div className="grove-card p-0 overflow-hidden">
      <div className="px-5 py-3 border-b border-dark-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest flex items-center gap-2">
          <Clock size={14} /> Clock-In Activ
        </h2>
        <span className="text-xs text-zinc-500">
          <span className="text-grove-green font-bold">{sessions.length}</span> membri online
        </span>
      </div>
      <div className="divide-y divide-dark-border/50">
        {sessions.map(s => <SessionRow key={s.id} s={s} />)}
      </div>
    </div>
  )
}
