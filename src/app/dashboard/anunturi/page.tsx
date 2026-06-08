'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Megaphone } from 'lucide-react'

const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']

interface Anunt {
  id: string
  title: string
  content: string
  author: string
  authorAvatar: string | null
  createdAt: string
  important: boolean
}

export default function AnunturiPage() {
  const { data: session } = useSession()
  const [anunturi, setAnunturi] = useState<Anunt[]>([])
  const [loading, setLoading]  = useState(true)
  const isLider = session?.user.roleIds?.some(r => LEADERSHIP_ROLES.includes(r))

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/anunturi')
      const d = await r.json()
      setAnunturi(d.anunturi || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5 animate-slide-up max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Anunțuri</h1>
          <p className="text-zinc-500 text-sm mt-1">Noutăți din organizație</p>
        </div>
        {isLider && (
          <a href="/dashboard/lider/anunturi"
            className="grove-btn flex items-center gap-2 text-sm">
            <Megaphone size={15} /> Postează
          </a>
        )}
      </div>

      {loading ? (
        <div className="grove-card text-center py-10 text-zinc-600">Se încarcă...</div>
      ) : anunturi.length === 0 ? (
        <div className="grove-card text-center py-10">
          <Megaphone size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-600">Niciun anunț momentan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {anunturi.map(a => (
            <div key={a.id} className={`grove-card ${a.important ? 'border-yellow-500/30 bg-yellow-500/5' : ''}`}>
              {a.important && (
                <div className="flex items-center gap-2 text-yellow-400 text-xs font-semibold mb-2">
                  ⚠️ IMPORTANT
                </div>
              )}
              <h2 className="text-white font-bold text-lg mb-2">{a.title}</h2>
              <p className="text-zinc-400 text-sm whitespace-pre-wrap mb-3">{a.content}</p>
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>👤 {a.author}</span>
                <span>{format(new Date(a.createdAt), 'dd MMM yyyy HH:mm', { locale: ro })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
