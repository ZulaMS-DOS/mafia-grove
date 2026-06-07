'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Plus, Check, X } from 'lucide-react'

interface Demisie {
  id: string; reason: string; status: string; createdAt: string; approvedAt: string | null
  user: { username: string }; approver: { username: string } | null
}

export default function DemisiiPage() {
  const { data: session } = useSession()
  const [demisii, setDemisii]   = useState<Demisie[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [reason, setReason]     = useState('')
  const [submitting, setSub]    = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/demisii')
    const d = await r.json()
    setDemisii(d.demisii || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!reason.trim()) return
    setSub(true)
    await fetch('/api/demisii', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
    setReason(''); setShowForm(false); await load(); setSub(false)
  }

  const review = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    await fetch(`/api/demisii/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await load()
  }

  const statusBadge = (s: string) => ({ PENDING: <span className="badge-pending">Pending</span>, ACCEPTED: <span className="badge-accepted">Acceptat</span>, REJECTED: <span className="badge-rejected">Respins</span> }[s])

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-black text-white">Demisii</h1><p className="text-zinc-500 text-sm mt-1">Cererile de demisie — vizibile pentru toți</p></div>
        <button onClick={() => setShowForm(!showForm)} className="grove-btn-danger flex items-center gap-2"><Plus size={16} /> Demisie</button>
      </div>

      {showForm && (
        <div className="grove-card border-red-500/30 animate-slide-up">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-widest mb-4">🚪 Cerere Demisie</h2>
          <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-xs text-red-400">
            ⚠️ Această acțiune notifică leadership-ul imediat.
          </div>
          <div className="form-group">
            <label className="grove-label">Motivul demisiei</label>
            <textarea className="grove-input resize-none" rows={4} placeholder="Explică decizia ta..."
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} disabled={submitting} className="grove-btn-danger">{submitting ? 'Se trimite...' : '💀 Trimite Demisia'}</button>
            <button onClick={() => setShowForm(false)} className="grove-btn-outline">Anulare</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading && <div className="grove-card text-center text-zinc-600 py-8">Se încarcă...</div>}
        {!loading && demisii.length === 0 && <div className="grove-card text-center text-zinc-600 py-8">Nicio cerere de demisie</div>}
        {demisii.map(d => (
          <div key={d.id} className="grove-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-white">{d.user.username}</span>
                  {statusBadge(d.status)}
                </div>
                <p className="text-zinc-400 text-sm mb-2">{d.reason}</p>
                <div className="text-xs text-zinc-600">{format(new Date(d.createdAt), 'dd MMM yyyy HH:mm', { locale: ro })}</div>
                {d.approver && <div className="mt-2 text-xs text-zinc-600">{d.status === 'ACCEPTED' ? '✅' : '❌'} {d.approver.username} — {d.approvedAt ? format(new Date(d.approvedAt), 'dd MMM HH:mm', { locale: ro }) : ''}</div>}
              </div>
              {session?.user.isLeadership && d.status === 'PENDING' && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => review(d.id, 'ACCEPTED')} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"><Check size={14} /></button>
                  <button onClick={() => review(d.id, 'REJECTED')} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"><X size={14} /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
