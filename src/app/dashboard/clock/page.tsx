'use client'
import { useState, useEffect, useCallback } from 'react'
import { Clock, Play, Square } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

interface Session {
  id: string; clockIn: string; clockOut: string | null; totalMinutes: number | null
}

export default function ClockPage() {
  const [loading, setLoading]         = useState(true)
  const [actionLoading, setAction]    = useState(false)
  const [active, setActive]           = useState<Session | null>(null)
  const [sessions, setSessions]       = useState<Session[]>([])
  const [minutesToday, setMinsToday]  = useState(0)
  const [minutesWeek, setMinsWeek]    = useState(0)
  const [now, setNow]                 = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    const r = await fetch('/api/clock')
    const d = await r.json()
    setActive(d.activeSession)
    setSessions(d.sessions || [])
    setMinsToday(d.minutesToday || 0)
    setMinsWeek(d.minutesWeek || 0)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const clockAction = async (action: 'in' | 'out') => {
    setAction(true)
    await fetch('/api/clock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    await load()
    setAction(false)
  }

  const fmtDur = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`

  const sessionDur = active
    ? Math.floor((now.getTime() - new Date(active.clockIn).getTime()) / 60000)
    : 0

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      <div>
        <h1 className="text-3xl font-black text-white">Clock In / Out</h1>
        <p className="text-zinc-500 text-sm mt-1">Înregistrează prezența ta</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clock Widget */}
        <div className="grove-card text-center">
          <div className="text-6xl font-black tabular-nums text-grove-green mb-2 tracking-tight">
            {now.toLocaleTimeString('ro-RO', { hour12: false })}
          </div>
          <div className="text-zinc-500 text-sm mb-6 capitalize">
            {format(now, 'EEEE, d MMMM yyyy', { locale: ro })}
          </div>

          {/* Status */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6 ${active ? 'bg-grove-dim text-grove-green border border-grove-border' : 'bg-dark-muted text-zinc-500 border border-dark-border'}`}>
            <div className={`w-2 h-2 rounded-full ${active ? 'bg-grove-green animate-pulse' : 'bg-zinc-600'}`} />
            {active ? `CLOCK IN — ${fmtDur(sessionDur)}` : 'OFFLINE'}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            <button onClick={() => clockAction('in')} disabled={!!active || actionLoading || loading}
              className="flex items-center gap-2 grove-btn disabled:opacity-40 disabled:cursor-not-allowed">
              <Play size={16} /> Clock In
            </button>
            <button onClick={() => clockAction('out')} disabled={!active || actionLoading || loading}
              className="flex items-center gap-2 grove-btn-danger disabled:opacity-40 disabled:cursor-not-allowed">
              <Square size={16} /> Clock Out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="grove-card">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Azi</div>
            <div className="text-3xl font-black text-grove-green">{fmtDur(minutesToday)}</div>
          </div>
          <div className="grove-card">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Săptămâna aceasta</div>
            <div className="text-3xl font-black text-blue-400">{fmtDur(minutesWeek)}</div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="grove-card">
        <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-4">📅 Istoric Sesiuni</h2>
        {loading ? (
          <div className="text-center py-8 text-zinc-600">Se încarcă...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-600">Nicio sesiune înregistrată</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-2 px-3 text-zinc-600 font-medium text-xs uppercase tracking-wider">Data</th>
                  <th className="text-left py-2 px-3 text-zinc-600 font-medium text-xs uppercase tracking-wider">Clock In</th>
                  <th className="text-left py-2 px-3 text-zinc-600 font-medium text-xs uppercase tracking-wider">Clock Out</th>
                  <th className="text-left py-2 px-3 text-zinc-600 font-medium text-xs uppercase tracking-wider">Durată</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} className="border-b border-dark-border/50 hover:bg-dark-hover transition-colors">
                    <td className="py-2.5 px-3 text-zinc-400">{format(new Date(s.clockIn), 'dd MMM', { locale: ro })}</td>
                    <td className="py-2.5 px-3 text-grove-green font-mono">{format(new Date(s.clockIn), 'HH:mm:ss')}</td>
                    <td className="py-2.5 px-3 text-red-400 font-mono">{s.clockOut ? format(new Date(s.clockOut), 'HH:mm:ss') : <span className="text-grove-green text-xs">ACTIV</span>}</td>
                    <td className="py-2.5 px-3 text-yellow-400 font-medium">{s.totalMinutes ? fmtDur(s.totalMinutes) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
