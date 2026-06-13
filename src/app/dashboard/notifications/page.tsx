'use client'
import { useState, useEffect, useCallback } from 'react'
import { Bell, Check } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

interface Notification {
  id: string; type: string; title: string
  message: string; read: boolean; createdAt: string
}

const typeIcon = (type: string) => ({
  announcement: '📢', tax: '💰', leave: '🏖️',
  resignation: '🚪', task: '✅'
}[type] || '🔔')

const typeBg = (type: string) => ({
  announcement: 'border-blue-500/20 bg-blue-500/5',
  tax:          'border-yellow-500/20 bg-yellow-500/5',
  leave:        'border-green-500/20 bg-green-500/5',
  resignation:  'border-red-500/20 bg-red-500/5',
  task:         'border-grove-border bg-grove-dim/20',
}[type] || 'border-dark-border')

export default function NotificationsPage() {
  const [notifs, setNotifs]   = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/notifications')
    const d = await r.json()
    setNotifs(d.notifications || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const markAll = async () => {
    setMarking(true)
    await fetch('/api/notifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: 'all' }),
    })
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setMarking(false)
  }

  const markOne = async (id: string) => {
    await fetch('/api/notifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const unreadCount = notifs.filter(n => !n.read).length

  return (
    <div className="space-y-5 animate-slide-up max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Bell size={26} className="text-grove-green" /> Notificări
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} necitite` : 'Toate citite'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll} disabled={marking}
            className="grove-btn-outline flex items-center gap-2 text-sm">
            <Check size={14} />
            {marking ? 'Se marchează...' : 'Marchează toate citite'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grove-card text-center py-12 text-zinc-600">Se încarcă...</div>
      ) : notifs.length === 0 ? (
        <div className="grove-card text-center py-16">
          <Bell size={48} className="text-zinc-700 mx-auto mb-3 opacity-50" />
          <p className="text-zinc-600 font-medium">Nicio notificare</p>
          <p className="text-zinc-700 text-sm mt-1">Vei fi notificat despre anunțuri, invoiri și demisii</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div key={n.id}
              onClick={() => !n.read && markOne(n.id)}
              className={`grove-card cursor-pointer transition-all duration-200 ${
                !n.read ? typeBg(n.type) : 'opacity-60'
              } ${!n.read ? 'hover:opacity-90' : ''}`}>
              <div className="flex items-start gap-4">
                <span className="text-2xl shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm leading-tight ${!n.read ? 'text-white' : 'text-zinc-400'}`}>
                    {n.title}
                  </div>
                  <p className="text-zinc-500 text-sm mt-1">{n.message}</p>
                  <div className="text-xs text-zinc-600 mt-2">
                    {format(new Date(n.createdAt), 'dd MMM yyyy HH:mm', { locale: ro })}
                  </div>
                </div>
                {!n.read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-grove-green shrink-0 mt-1.5 animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
