'use client'
import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Shield, ScrollText } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

interface Fine {
  id: string; tip: string; material: string; bucati: number; termen: string
  fwLevel: number | null; givenByName: string; createdAt: string
}

export default function AmenziPage() {
  const [fines, setFines]     = useState<Fine[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'amenda' | 'fw' | 'logs'>('amenda')

  const load = useCallback(async () => {
    const r = await fetch('/api/amenzi')
    const d = await r.json()
    setFines(d.fines || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const amenzi = fines.filter(f => f.tip === 'amenda' || !f.tip)
  const fwuri  = fines.filter(f => f.tip === 'fw').sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // Calculeaza totalul FW cumulat
  const totalFw = Math.min(fwuri.reduce((sum, f) => sum + (f.fwLevel || 1), 0), 3)
  const fwHistory = fwuri.map(f => `FW ${f.fwLevel}/3`)
  const fwHistoryText = fwHistory.length > 1
    ? `${fwHistory.join(' + ')} = FW ${totalFw}/3`
    : fwHistory.length === 1 ? `FW ${totalFw}/3` : ''

  const fwColor  = totalFw === 3 ? 'text-red-400' : totalFw === 2 ? 'text-orange-400' : 'text-yellow-400'
  const fwBorder = totalFw === 3 ? 'border-red-500/20 bg-red-500/5' : totalFw === 2 ? 'border-orange-500/20 bg-orange-500/5' : 'border-yellow-500/20 bg-yellow-500/5'

  // Toate sancțiunile sortate cronologic descrescator pentru logs
  const allSorted = [...fines].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="space-y-5 animate-slide-up max-w-2xl">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <AlertTriangle size={28} className="text-red-400" /> Sancțiunile Mele
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Istoricul amenzilor și avertismentelor primite</p>
      </div>

      <div className="flex gap-1 border-b border-dark-border">
        <button onClick={() => setTab('amenda')}
          className={`px-5 py-2.5 text-sm font-medium transition-all flex items-center gap-2 ${
            tab === 'amenda' ? 'text-red-400 border-b-2 border-red-400' : 'text-zinc-500 hover:text-white'
          }`}>
          <AlertTriangle size={14} /> Amenzi
          {amenzi.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              {amenzi.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('fw')}
          className={`px-5 py-2.5 text-sm font-medium transition-all flex items-center gap-2 ${
            tab === 'fw' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-zinc-500 hover:text-white'
          }`}>
          <Shield size={14} /> Faction Warn
          {fwuri.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
              {totalFw}/3
            </span>
          )}
        </button>
        <button onClick={() => setTab('logs')}
          className={`px-5 py-2.5 text-sm font-medium transition-all flex items-center gap-2 ${
            tab === 'logs' ? 'text-zinc-300 border-b-2 border-zinc-300' : 'text-zinc-500 hover:text-white'
          }`}>
          <ScrollText size={14} /> Toate Sancțiunile
          {allSorted.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 border border-zinc-600/30">
              {allSorted.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="grove-card text-center py-12 text-zinc-600">Se încarcă...</div>
      ) : tab === 'amenda' ? (
        amenzi.length === 0 ? (
          <div className="grove-card text-center py-16">
            <Shield size={48} className="text-green-400/50 mx-auto mb-3" />
            <p className="text-zinc-600 font-medium">Nicio amendă! 🎉</p>
            <p className="text-zinc-700 text-sm mt-1">Continuă așa!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {amenzi.map(f => (
              <div key={f.id} className="grove-card border-red-500/20 bg-red-500/5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                    <span className="text-red-400 font-bold text-base">{f.material}</span>
                  </div>
                  <div className="flex gap-4 text-sm text-zinc-500">
                    {f.bucati > 0 && <span>📦 {f.bucati} buc</span>}
                    {f.termen && <span>⏰ {f.termen}</span>}
                  </div>
                  <div className="text-xs text-zinc-600 mt-2">
                    De la {f.givenByName} · {format(new Date(f.createdAt), 'dd MMM yyyy HH:mm', { locale: ro })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === 'fw' ? (
        fwuri.length === 0 ? (
          <div className="grove-card text-center py-16">
            <Shield size={48} className="text-green-400/50 mx-auto mb-3" />
            <p className="text-zinc-600 font-medium">Niciun Faction Warn! 🎉</p>
            <p className="text-zinc-700 text-sm mt-1">Continuă așa!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={`grove-card ${fwBorder}`}>
              <div className="flex items-center gap-3 mb-1">
                <Shield size={24} className={fwColor} />
                <div>
                  <div className={`text-xl font-black ${fwColor}`}>FW {totalFw}/3</div>
                  {fwHistoryText && (
                    <div className="text-xs text-zinc-500 mt-0.5">{fwHistoryText}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-zinc-600 uppercase tracking-widest px-1">Istoric Detaliat</div>
            {fwuri.map((f, i) => (
              <div key={f.id} className="grove-card border-dark-border bg-dark-hover">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-zinc-600 font-mono">#{i + 1}</span>
                      <span className={`font-bold text-sm ${fwColor}`}>FW {f.fwLevel}/3</span>
                    </div>
                    <div className="text-sm text-zinc-400">{f.material}</div>
                    <div className="text-xs text-zinc-600 mt-1">
                      De la {f.givenByName} · {format(new Date(f.createdAt), 'dd MMM yyyy HH:mm', { locale: ro })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Tab Logs — toate sancțiunile
        allSorted.length === 0 ? (
          <div className="grove-card text-center py-16">
            <Shield size={48} className="text-green-400/50 mx-auto mb-3" />
            <p className="text-zinc-600 font-medium">Nicio sancțiune! 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allSorted.map(f => (
              <div key={f.id} className={`grove-card ${
                f.tip === 'fw'
                  ? 'border-orange-500/20 bg-orange-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {f.tip === 'fw'
                        ? <Shield size={14} className="text-orange-400 shrink-0" />
                        : <AlertTriangle size={14} className="text-red-400 shrink-0" />
                      }
                      <span className={`font-bold text-sm ${f.tip === 'fw' ? 'text-orange-400' : 'text-red-400'}`}>
                        {f.tip === 'fw' ? `FW ${f.fwLevel}/3` : f.material}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                        f.tip === 'fw'
                          ? 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                          : 'text-red-400 border-red-500/30 bg-red-500/10'
                      }`}>
                        {f.tip === 'fw' ? 'FW' : 'Amendă'}
                      </span>
                    </div>
                    {f.tip === 'fw' && (
                      <div className="text-sm text-zinc-400">{f.material}</div>
                    )}
                    {f.tip !== 'fw' && (f.bucati > 0 || f.termen) && (
                      <div className="flex gap-3 text-xs text-zinc-500 mt-0.5">
                        {f.bucati > 0 && <span>📦 {f.bucati} buc</span>}
                        {f.termen && <span>⏰ {f.termen}</span>}
                      </div>
                    )}
                    <div className="text-xs text-zinc-600 mt-1">
                      De la {f.givenByName} · {format(new Date(f.createdAt), 'dd MMM yyyy HH:mm', { locale: ro })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
