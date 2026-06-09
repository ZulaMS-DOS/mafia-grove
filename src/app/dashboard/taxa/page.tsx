'use client'
import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { CheckCircle, Circle, RefreshCw } from 'lucide-react'

interface TaxItem {
  id: string; name: string; neoficial: number; oficial: number
}

type Filter = 'toate' | 'neoficiale' | 'oficiale'

export default function TaxaPage() {
  const [items, setItems]     = useState<TaxItem[]>([])
  const [paid, setPaid]       = useState(false)
  const [paidAt, setPaidAt]   = useState<string | null>(null)
  const [weekStart, setWeek]  = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying]   = useState(false)
  const [filter, setFilter]   = useState<Filter>('toate')
  const [lastUpdate, setLast] = useState(new Date())

  const load = useCallback(async () => {
    const r = await fetch('/api/taxa')
    const d = await r.json()
    setItems(d.items || [])
    setPaid(d.paid)
    setPaidAt(d.paidAt)
    setWeek(d.weekStart)
    setLast(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const markPaid = async () => {
    setPaying(true)
    await fetch('/api/taxa', { method: 'POST' })
    await load()
    setPaying(false)
  }

  const filteredItems = items.filter(item => {
    if (filter === 'neoficiale') return item.neoficial > 0
    if (filter === 'oficiale')   return item.oficial > 0
    return true
  })

  return (
    <div className="space-y-5 animate-slide-up max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Taxa Sindicat</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {weekStart ? `Săptămâna: ${format(new Date(weekStart), 'dd MMM yyyy', { locale: ro })}` : 'Se încarcă...'}
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-zinc-600 hover:text-grove-green hover:bg-grove-dim transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Status plată */}
      <div className={`grove-card flex items-center justify-between ${paid ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
        <div className="flex items-center gap-3">
          {paid
            ? <CheckCircle size={24} className="text-green-400 shrink-0" />
            : <Circle size={24} className="text-red-400 shrink-0" />
          }
          <div>
            <div className={`font-bold text-lg ${paid ? 'text-green-400' : 'text-red-400'}`}>
              {paid ? 'TAXA PLĂTITĂ' : 'TAXA NEPLĂTITĂ'}
            </div>
            {paid && paidAt && (
              <div className="text-xs text-zinc-500">
                Plătit la {format(new Date(paidAt), 'dd MMM HH:mm', { locale: ro })}
              </div>
            )}
          </div>
        </div>
        {!paid && (
          <button onClick={markPaid} disabled={paying || items.length === 0}
            className="grove-btn text-sm disabled:opacity-40">
            {paying ? 'Se marchează...' : '✓ Marchează ca Plătit'}
          </button>
        )}
      </div>

      {/* Filtre */}
      <div className="flex gap-2">
        {(['toate', 'neoficiale', 'oficiale'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
              filter === f
                ? 'bg-grove-dim text-grove-green border border-grove-border'
                : 'text-zinc-500 border border-dark-border hover:text-white hover:bg-dark-hover'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="ml-auto text-xs text-zinc-600 flex items-center">
          Actualizat: {format(lastUpdate, 'HH:mm:ss')}
        </div>
      </div>

      {/* Lista materiale */}
      <div className="grove-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-zinc-600">Se încarcă...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-zinc-600">Nicio taxă setată pentru săptămâna aceasta.</p>
            <p className="text-zinc-700 text-sm mt-1">Liderul va seta materialele în curând.</p>
          </div>
        ) : (
          <>
            {/* Header tabel */}
            <div className="grid grid-cols-4 px-5 py-3 border-b border-dark-border">
              <div className="text-xs text-zinc-600 uppercase tracking-wider col-span-2">Material</div>
              <div className="text-xs text-zinc-600 uppercase tracking-wider text-center">Neoficial</div>
              <div className="text-xs text-zinc-600 uppercase tracking-wider text-center">Oficial</div>
            </div>

            {filteredItems.map((item, i) => (
              <div key={item.id}
                className={`grid grid-cols-4 px-5 py-4 items-center border-b border-dark-border/50 hover:bg-dark-hover transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-grove-green shrink-0" />
                  <span className="text-white font-medium text-sm">{item.name}</span>
                </div>
                <div className="text-center">
                  {item.neoficial > 0
                    ? <span className="text-grove-green font-bold">{item.neoficial.toLocaleString()}</span>
                    : <span className="text-zinc-700">—</span>
                  }
                </div>
                <div className="text-center">
                  {item.oficial > 0
                    ? <span className="text-blue-400 font-bold">{item.oficial.toLocaleString()}</span>
                    : <span className="text-zinc-700">—</span>
                  }
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
