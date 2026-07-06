'use client'
import { useState, useEffect, useCallback } from 'react'
import { Trophy, ShoppingCart, Dices, Coins, RefreshCw, Star } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Image from 'next/image'

interface LeaderEntry { id: string; username: string; avatar: string | null; points: number; discordId: string }
interface Activity {
  id: string; type: 'shop' | 'wheel' | 'points'; username: string; avatar: string | null
  description: string; createdAt: string
}

export default function LeaderboardPage() {
  const [leaders, setLeaders]       = useState<LeaderEntry[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLast]       = useState(new Date())

  const load = useCallback(async () => {
    const r = await fetch('/api/leaderboard')
    const d = await r.json()
    setLeaders(d.leaders   || [])
    setActivities(d.activities || [])
    setLast(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  const medalColor = (i: number) => {
    if (i === 0) return 'text-yellow-400'
    if (i === 1) return 'text-zinc-400'
    if (i === 2) return 'text-amber-600'
    return 'text-zinc-700'
  }

  const activityIcon = (type: string) => {
    if (type === 'shop')   return <ShoppingCart size={14} className="text-blue-400 shrink-0" />
    if (type === 'wheel')  return <Dices size={14} className="text-purple-400 shrink-0" />
    return <Coins size={14} className="text-yellow-400 shrink-0" />
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Trophy size={28} className="text-yellow-400" /> Leaderboard
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Clasament în timp real · actualizat la {format(lastUpdate, 'HH:mm:ss')}
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-zinc-600 hover:text-grove-green hover:bg-grove-dim transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="grove-card text-center py-16 text-zinc-600">Se încarcă...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Clasament puncte */}
          <div className="grove-card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-border flex items-center gap-2">
              <Star size={14} className="text-yellow-400" />
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">Top Puncte</h2>
            </div>
            <div className="divide-y divide-dark-border/50">
              {leaders.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-sm">Niciun member</div>
              ) : leaders.map((m, i) => (
                <div key={m.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-dark-hover transition-colors ${i < 3 ? 'bg-white/[0.01]' : ''}`}>
                  <span className={`text-lg font-black w-7 text-center shrink-0 ${medalColor(i)}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full border border-dark-border overflow-hidden shrink-0 bg-dark-muted flex items-center justify-center">
                    {m.avatar
                      ? <Image src={m.avatar} alt={m.username} width={32} height={32} className="object-cover" unoptimized />
                      : <span className="text-xs">👤</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{m.username}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Coins size={12} className="text-yellow-400" />
                    <span className="text-yellow-400 font-black text-sm">{m.points}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activitate recenta */}
          <div className="grove-card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-border flex items-center gap-2">
              <RefreshCw size={14} className="text-grove-green" />
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">Activitate Recentă</h2>
            </div>
            <div className="divide-y divide-dark-border/50">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-sm">Nicio activitate recentă</div>
              ) : activities.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-dark-hover transition-colors">
                  {activityIcon(a.type)}
                  <div className="w-7 h-7 rounded-full border border-dark-border overflow-hidden shrink-0 bg-dark-muted flex items-center justify-center">
                    {a.avatar
                      ? <Image src={a.avatar} alt={a.username} width={28} height={28} className="object-cover" unoptimized />
                      : <span className="text-xs">👤</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-semibold truncate">{a.username}</div>
                    <div className="text-zinc-500 text-xs truncate">{a.description}</div>
                  </div>
                  <div className="text-xs text-zinc-700 shrink-0">
                    {format(new Date(a.createdAt), 'HH:mm', { locale: ro })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
