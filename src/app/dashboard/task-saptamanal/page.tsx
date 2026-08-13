'use client'
import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { RefreshCw, CheckCircle, XCircle, Sword } from 'lucide-react'

const JAF_LABELS: Record<string, string> = {
  vinewood:    '🎬 Vinewood',
  alta:        '🏦 Alta',
  desert:      '🏜️ Desert',
  highway:     '🛣️ Highway',
  pacific:     '🌊 Pacific',
  blaine:      '⛰️ Blaine',
  biju:        '💎 Biju',
  magazin:     '🏪 Magazin',
  digital_den: '💻 Digital Den',
  atm:         '💳 ATM',
}

interface JafEntry { type: string; count: number }
interface TaxItem {
  id: string; name: string; bucati: number; termen: string | null
  expired: boolean; jafuri: JafEntry[] | null
}
interface JafProgress {
  type: string; required: number; done: number
}
interface ItemProgress {
  itemName: string; jafProgress: JafProgress[]
  totalRequired: number; totalDone: number; completed: boolean
}
interface Progress {
  itemProgress: ItemProgress[]; allCompleted: boolean
}

export default function TaskSaptamanalPage() {
  const [items, setItems]       = useState<TaxItem[]>([])
  const [paid, setPaid]         = useState(false)
  const [paidAt, setPaidAt]     = useState<string | null>(null)
  const [weekStart, setWeek]    = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [lastUpdate, setLast]   = useState(new Date())
  const [progress, setProgress] = useState<Progress | null>(null)

  const load = useCallback(async () => {
    const [taxRes, progRes] = await Promise.all([
      fetch('/api/taxa?role=955126892984410162'),
      fetch('/api/taxa/progress/member'),
    ])
    const taxData  = await taxRes.json()
    const progData = await progRes.json()
    setItems(taxData.items || [])
    setPaid(taxData.paid)
    setPaidAt(taxData.paidAt)
    setWeek(taxData.weekStart)
    setProgress(progData.progress || null)
    setLast(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  return (
    <div className="space-y-5 animate-slide-up max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Sword size={28} className="text-red-400" /> Task Săptămânal
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {weekStart ? `Săptămâna: ${format(new Date(weekStart), 'dd MMM yyyy', { locale: ro })}` : 'Grove Killer — Task săptămânal'}
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-zinc-600 hover:text-grove-green hover:bg-grove-dim transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Status achitat */}
      <div className={`grove-card flex items-center gap-4 ${paid ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5'}`}>
        {paid
          ? <CheckCircle size={32} className="text-green-400 shrink-0" />
          : <XCircle size={32} className="text-red-400 shrink-0" />
        }
        <div>
          <div className={`text-xl font-black ${paid ? 'text-green-400' : 'text-red-400'}`}>
            {paid ? 'TASK COMPLETAT ✓' : 'TASK NECOMPLETAT'}
          </div>
          {paid && paidAt
            ? <div className="text-xs text-zinc-500 mt-0.5">Confirmat la {format(new Date(paidAt), 'dd MMM yyyy HH:mm', { locale: ro })}</div>
            : <div className="text-xs text-zinc-500 mt-0.5">Taxa se marchează automat când toate jafurile sunt completate</div>
          }
        </div>
      </div>

      {/* Bara progres colectiv */}
      {progress && progress.itemProgress.length > 0 && (
        <div className="grove-card space-y-3">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-widest">⚔️ Progres Colectiv Jafuri</h2>
          {progress.itemProgress.map((item, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">{item.itemName}</span>
                <span className={item.completed ? 'text-green-400 font-bold' : 'text-zinc-500'}>
                  {item.totalDone}/{item.totalRequired} {item.completed ? '✅' : ''}
                </span>
              </div>
              <div className="w-full h-2 bg-dark-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.completed ? 'bg-green-400' : 'bg-red-400'}`}
                  style={{ width: item.totalRequired ? `${Math.min((item.totalDone / item.totalRequired) * 100, 100)}%` : '0%' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-1">
                {item.jafProgress.map((jaf, j) => (
                  <div key={j} className="flex justify-between text-xs text-zinc-600 bg-dark-hover rounded-lg px-2 py-1">
                    <span>{JAF_LABELS[jaf.type] || jaf.type}</span>
                    <span className={jaf.done >= jaf.required ? 'text-green-400 font-bold' : 'text-zinc-500'}>
                      {jaf.done}/{jaf.required}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista cerinte */}
      <div className="grove-card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-dark-border">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-widest">⚔️ Cerințe Săptămânale</h2>
        </div>
        {loading ? (
          <div className="text-center py-10 text-zinc-600">Se încarcă...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">⚔️</div>
            <p className="text-zinc-600 text-sm">Niciun task setat pentru această săptămână.</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-border/50">
            {items.map((item) => (
              <div key={item.id} className={`px-5 py-4 hover:bg-dark-hover transition-colors ${item.expired ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.expired ? 'bg-red-500' : 'bg-red-400'}`} />
                    <span className="text-white text-sm font-semibold">{item.name}</span>
                  </div>
                  {item.termen && (
                    <span className={item.expired ? 'text-red-400 font-semibold text-xs' : 'text-yellow-400 text-xs'}>
                      {item.expired ? '⛔ Expirat' : format(new Date(item.termen), 'dd MMM yyyy', { locale: ro })}
                    </span>
                  )}
                </div>
                {item.jafuri && item.jafuri.length > 0 ? (
                  <div className="space-y-1 ml-3.5">
                    {item.jafuri.map((jaf, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className="text-xs text-red-400 font-bold">{jaf.count}x</span>
                        <span className="text-xs text-zinc-300">{JAF_LABELS[jaf.type] || jaf.type}</span>
                      </div>
                    ))}
                    <div className="text-xs text-zinc-600 pt-1">
                      Total: {item.jafuri.map(j => `${j.count}x ${JAF_LABELS[j.type] || j.type}`).join(' + ')}
                    </div>
                  </div>
                ) : item.bucati > 0 ? (
                  <div className="ml-3.5 text-xs text-zinc-400">
                    Cantitate: <span className="text-red-400 font-bold">{item.bucati}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-700 text-center">
        Actualizat la {format(lastUpdate, 'HH:mm:ss')} · Se actualizează automat la 30s
      </p>
    </div>
  )
}
