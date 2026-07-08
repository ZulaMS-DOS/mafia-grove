'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Check, CheckCheck } from 'lucide-react'
import Image from 'next/image'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Link from 'next/link'

interface Notification {
  id: string; type: string; title: string; message: string; read: boolean; createdAt: string
}
interface Activity {
  id: string; type: string; username: string; description: string; createdAt: string
}
interface Props {
  user: { name: string; image: string; isLeadership: boolean }
}

const typeIcon = (type: string) => ({
  announcement: '📢', tax: '💰', leave: '🏖️', resignation: '🚪', task: '✅', fine: '⚠️'
}[type] || '🔔')

const activityEmoji = (type: string) => ({
  shop: '🛒', wheel: '🎰', points: '💰'
}[type] || '⚡')

export function Topbar({ user }: Props) {
  const [open, setOpen]         = useState(false)
  const [notifs, setNotifs]     = useState<Notification[]>([])
  const [unread, setUnread]     = useState(0)
  const [marking, setMarking]   = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [tickerIdx, setTickerIdx]   = useState(0)
  const dropRef                 = useRef<HTMLDivElement>(null)

  const loadNotifs = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications')
      const d = await r.json()
      setNotifs(d.notifications || [])
      setUnread(d.unreadCount   || 0)
    } catch {}
  }, [])

  const loadActivities = useCallback(async () => {
    try {
      const r = await fetch('/api/leaderboard')
      const d = await r.json()
      setActivities(d.activities || [])
    } catch {}
  }, [])

  useEffect(() => {
    loadNotifs()
    loadActivities()
    const t1 = setInterval(loadNotifs, 5000)
    const t2 = setInterval(loadActivities, 15000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [loadNotifs, loadActivities])

  // Ticker — schimba activitatea la fiecare 4 secunde
  useEffect(() => {
    if (!activities.length) return
    const t = setInterval(() => {
      setTickerIdx(prev => (prev + 1) % Math.min(activities.length, 10))
    }, 4000)
    return () => clearInterval(t)
  }, [activities])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAll = async () => {
    setMarking(true)
    await fetch('/api/notifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: 'all' }),
    })
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
    setMarking(false)
  }

  const markOne = async (id: string) => {
    await fetch('/api/notifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const currentActivity = activities[tickerIdx]

  return (
    <div className="shrink-0">
      {/* Header principal */}
      <header className="h-14 bg-dark-card border-b border-dark-border/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-grove-green animate-pulse" />
          <span className="text-xs text-zinc-500 tracking-widest uppercase">Live</span>
        </div>

        <div className="flex items-center gap-3">
          {user.isLeadership && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-grove-dim text-grove-green border border-grove-border">
              ⭐ Leadership
            </span>
          )}

          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setOpen(!open)}
              className="relative p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-dark-hover transition-colors"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-dark-card border border-dark-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">Notificări</span>
                    {unread > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                        {unread} noi
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <button onClick={markAll} disabled={marking}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-grove-green transition-colors px-2 py-1 rounded-lg hover:bg-grove-dim">
                        <CheckCheck size={12} />
                        {marking ? '...' : 'Citește toate'}
                      </button>
                    )}
                    <Link href="/dashboard/notifications" onClick={() => setOpen(false)}
                      className="text-xs text-grove-green hover:underline">
                      Vezi toate
                    </Link>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600 text-sm">
                      <Bell size={24} className="mx-auto mb-2 opacity-30" />
                      Nicio notificare
                    </div>
                  ) : (
                    notifs.slice(0, 10).map(n => (
                      <div key={n.id} onClick={() => !n.read && markOne(n.id)}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-dark-border/50 cursor-pointer hover:bg-dark-hover transition-colors ${!n.read ? 'bg-grove-dim/20' : ''}`}>
                        <span className="text-lg shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold leading-tight ${!n.read ? 'text-white' : 'text-zinc-400'}`}>
                            {n.title}
                          </div>
                          <div className="text-xs text-zinc-600 mt-0.5 line-clamp-2">{n.message}</div>
                          <div className="text-xs text-zinc-700 mt-1">
                            {format(new Date(n.createdAt), 'dd MMM HH:mm', { locale: ro })}
                          </div>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-grove-green shrink-0 mt-1.5 animate-pulse" />}
                      </div>
                    ))
                  )}
                </div>

                {unread > 0 && (
                  <div className="px-4 py-2.5 border-t border-dark-border">
                    <button onClick={markAll} disabled={marking}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-grove-green border border-grove-border hover:bg-grove-dim transition-colors disabled:opacity-50">
                      <Check size={13} />
                      {marking ? 'Se marchează...' : 'Marchează toate ca citite'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white leading-none">{user.name}</div>
              <div className="text-xs text-zinc-600 mt-0.5">{user.isLeadership ? 'Lider' : 'Membru'}</div>
            </div>
            {user.image
              ? <Image src={user.image} alt={user.name} width={34} height={34} className="rounded-full border-2 border-grove-border" unoptimized />
              : <div className="w-9 h-9 rounded-full bg-dark-muted border-2 border-dark-border flex items-center justify-center text-lg">🤵</div>
            }
          </div>
        </div>
      </header>

      {/* Ticker activitate live */}
      {currentActivity && (
        <div className="h-7 bg-black/40 border-b border-dark-border/30 flex items-center px-4 gap-3 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-grove-green animate-pulse" />
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Live</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div key={tickerIdx} className="flex items-center gap-2 animate-slide-up">
              <span className="text-xs">{activityEmoji(currentActivity.type)}</span>
              <span className="text-xs text-zinc-400 truncate">
                <span className="text-white font-semibold">{currentActivity.username}</span>
                {' '}{currentActivity.description}
              </span>
              <span className="text-[10px] text-zinc-700 shrink-0">
                {format(new Date(currentActivity.createdAt), 'HH:mm')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
