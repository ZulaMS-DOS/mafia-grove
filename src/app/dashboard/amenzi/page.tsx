'use client'
import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Shield } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

interface Fine {
  id: string; material: string; bucati: number; termen: string
  fwLevel: number | null; givenByName: string; createdAt: string
}

export default function AmenziPage() {
  const [fines, setFines]     = useState<Fine[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const r = await fetch('/api/amenzi')
    const d = await r.json()
    setFines(d.fines || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5 animate-slide-up max-w-2xl">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <AlertTriangle size={28} className="text-red-400" /> Amenzile Mele
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Istoricul amenzilor primite</p>
      </div>

      {loading ? (
        <div className="grove-card text-center py-12 text-zinc-600">Se încarcă...</div>
      ) : fines.length === 0 ? (
        <div className="grove-card text-center py-16">
          <Shield size={48} className="text-green-400/50 mx-auto mb-3" />
          <p className="text-zinc-600 font-medium">Nicio amendă! 🎉</p>
          <p className="text-zinc-700 text-sm mt-1">Continuă așa!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fines.map(f => (
            <div key={f.id} className="grove-card border-red-500/20 bg-red-500/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-400 font-bold text-base">{f.material}</span>
                    {f.fwLevel && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                        FW {f.fwLevel}/3
                      </span>
                    )}
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
