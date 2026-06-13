'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import Image from 'next/image'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Link from 'next/link'

interface Notification {
  id: string; type: string; title: string; message: string; read: boolean; createdAt: string
}

interface Props {
  user: { name: string; image: string; isLeadership: boolean }
}

const typeIcon = (type: string) => ({
  announcement: '📢', tax: '💰', leave: '🏖️', resignation: '🚪', task: '✅'
}[type] || '🔔')

export function Topbar({ user }: Props) {
  const [open, setOpen]           = useState(false)
  const [notifs, setNotifs]       = useState<Notification[]>([])
  const [unread, setUnread]       = useState(0)
  const dropRef                   = useRef<HTMLDivElement>(null)

  const loadNotifs = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications')
      const d = await r.json()
      setNotifs(d.notifications || [])
      setUnread(d.unreadCount   || 0)
    } catch {}
  }, [])

  useEffect(() => {
    loadNotifs()
    const t = setInterval(loadNotifs, 30000)
    return () => clearInterval(t)
  }, [loadNotifs])

  // Inchide dropdown la click afara
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: 'all' }),
    })
    setUnread(0)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  return (
    <header className="h-14 bg-dark-card border-b border-dark-border flex items-center justify-between px-6 shrink-0">
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

        {/* ── Clopoțel notificări ── */}
        <div className="relative" ref={dropRef}>
          <button onClick={() => { setOpen(!open); if (!open) loadNotifs() }}
            className="relative p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-dark-hover transition-colors">
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-dark-card border border-dark-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
              {/* Header dropdown */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
                <span className="font-semibold text-white text-sm">Notificări</span>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-zinc-500 hover:text-grove-green transition-colors">
                      Marchează toate citite
                    </button>
                  )}
                  <Link href="/dashboard/notifications" onClick={() => setOpen(false)}
                    className="text-xs text-grove-green hover:underline">
                    Vezi toate
                  </Link>
                </div>
              </div>

              {/* Lista */}
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="text-center py-8 text-zinc-600 text-sm">
                    <Bell size={24} className="mx-auto mb-2 opacity-30" />
                    Nicio notificare
                  </div>
                ) : (
                  notifs.slice(0, 10).map(n => (
                    <div key={n.id}
                      onClick={() => !n.read && markRead(n.id)}
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
                      {!n.read && <div className="w-2 h-2 rounded-full bg-grove-green shrink-0 mt-1.5" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-white leading-none">{user.name}</div>
            <div className="text-xs text-zinc-600 mt-0.5">{user.isLeadership ? 'Lider' : 'Membru'}</div>
          </div>
          {user.image
            ? <Image src={user.image} alt={user.name} width={34} height={34} className="rounded-full border-2 border-grove-border" />
            : <div className="w-9 h-9 rounded-full bg-dark-muted border-2 border-dark-border flex items-center justify-center text-lg">🤵</div>
          }
        </div>
      </div>
    </header>
  )
}
