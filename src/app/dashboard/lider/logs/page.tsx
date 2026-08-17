'use client'
import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { RefreshCw, Users, Coins, Sword } from 'lucide-react'

interface Log {
  id: string; categorie: string; titlu: string; continut: string; createdAt: string
}

const CATEGORII = [
  { id: 'all',        label: 'Toate',      icon: '📋' },
  { id: 'muncitori',  label: 'Muncitori',  icon: '👥' },
  { id: 'taxa',       label: 'Taxă',       icon: '💰' },
  { id: 'jafuri',     label: 'Jafuri',     icon: '🏴' },
  { id: 'sanctiuni',  label: 'Sancțiuni',  icon: '⚠️' },
]

export default function LogsPage() {
  const [logs, setLogs]         = useState<Log[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    const params = tab !== 'all' ? `?categorie=${tab}` : ''
    const r = await fetch(`/api/logs${params}`)
    const d = await r.json()
    setLogs(d.logs || [])
    setLoading(false)
  }, [tab])

  useEffect(() => { setLoading(true); load() }, [load])

    const categorieColor = (cat: string) => ({
    muncitori:  'text-zinc-400 border-zinc-600/30 bg-zinc-600/10',
    taxa:       'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    jafuri:     'text-red-400 border-red-500/30 bg-red-500/10',
    sanctiuni:  'text-orange-400 border-orange-500/30 bg-orange-500/10',
  }[cat] || 'text-grove-green border-grove-border bg-grove-dim')

  const categorieEmoji = (cat: string) => ({
    muncitori: '👥', taxa: '💰', jafuri: '🏴', sanctiuni: '⚠️'
  }[cat] || '📋')

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Logs Bot</h1>
          <p className="text-zinc-500 text-sm mt-1">Istoricul notificărilor trimise de bot</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-zinc-600 hover:text-grove-green hover:bg-grove-dim transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tab-uri categorii */}
      <div className="flex gap-1 border-b border-dark-border overflow-x-auto">
        {CATEGORII.map(c => (
          <button key={c.id} onClick={() => setTab(c.id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-2 ${
              tab === c.id
                ? 'text-grove-green border-b-2 border-grove-green'
                : 'text-zinc-500 hover:text-white'
            }`}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grove-card text-center py-10 text-zinc-600">Se încarcă...</div>
      ) : logs.length === 0 ? (
        <div className="grove-card text-center py-10">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-zinc-600 text-sm">Niciun log în această categorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="grove-card cursor-pointer hover:border-grove-border transition-all"
              onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{categorieEmoji(log.categorie)}</span>
                  <div className="min-w-0">
                    <div className="text-white font-semibold text-sm">{log.titlu}</div>
                    <div className="text-xs text-zinc-600 mt-0.5">
                      {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm', { locale: ro })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${categorieColor(log.categorie)}`}>
                    {log.categorie}
                  </span>
                  <span className="text-zinc-600 text-xs">{expanded === log.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === log.id && (
                <div className="mt-3 pt-3 border-t border-dark-border">
                  <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono bg-dark-hover rounded-lg p-3 overflow-x-auto">
                    {log.continut}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
