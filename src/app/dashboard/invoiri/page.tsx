'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Plus, Check, X } from 'lucide-react'

interface Invoire {
  id: string; reason: string; startDate: string; endDate: string; status: string;
  createdAt: string; approvedAt: string | null;
  user: { username: string; avatar: string | null }
  approver: { username: string } | null
}

export default function InvoiriPage() {
  const { data: session } = useSession()
  const [invoiri, setInvoiri]   = useState<Invoire[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSub]    = useState(false)
  const [form, setForm]         = useState({ reason: '', startDate: '', endDate: '' })

  const load = useCallback(async () => {
    const r = await fetch('/api/invoiri')
    const d = await r.json()
    setInvoiri(d.invoiri || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!form.reason || !form.startDate || !form.endDate) return
    setSub(true)
    await fetch('/api/invoiri', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ reason: '', startDate: '', endDate: '' })
    setShowForm(false)
    await load()
    setSub(false)
  }

  const review = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    await fetch(`/api/invoiri/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await load()
  }

  const statusBadge = (s: string) => ({
    PENDING:  <span className="badge-pending">Pending</span>,
    ACCEPTED: <span className="badge-accepted">Acceptat</span>,
    REJECTED: <span className="badge-rejected">Respins</span>,
  }[s] ?? null)

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Invoiri</h1>
          <p className="text-zinc-500 text-sm mt-1">Cererile de invoire — vizibile pentru toți membrii</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="grove-btn flex items-center gap-2">
          <Plus size={16} /> Cerere Nouă
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="grove-card border-grove-border animate-slide-up">
          <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-4">📝 Cerere Invoire</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="grove-label">Motiv</label>
              <textarea className="grove-input resize-none" rows={3} placeholder="Descrie motivul invoirii..."
                value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div>
              <label className="grove-label">Data Început</label>
              <input type="date" className="grove-input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="grove-label">Data Sfârșit</label>
              <input type="date" className="grove-input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={submit} disabled={submitting} className="grove-btn">{submitting ? 'Se trimite...' : 'Trimite Cererea'}</button>
            <button onClick={() => setShowForm(false)} className="grove-btn-outline">Anulare</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading && <div className="grove-card text-center text-zinc-600 py-8">Se încarcă...</div>}
        {!loading && invoiri.length === 0 && <div className="grove-card text-center text-zinc-600 py-8">Nicio cerere de invoire</div>}
        {invoiri.map(inv => (
          <div key={inv.id} className="grove-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-white">{inv.user.username}</span>
                  {statusBadge(inv.status)}
                </div>
                <p className="text-zinc-400 text-sm mb-2">{inv.reason}</p>
                <div className="flex gap-4 text-xs text-zinc-600">
                  <span>📅 {format(new Date(inv.startDate), 'dd MMM yyyy', { locale: ro })} → {format(new Date(inv.endDate), 'dd MMM yyyy', { locale: ro })}</span>
                  <span>🕐 {format(new Date(inv.createdAt), 'dd MMM HH:mm', { locale: ro })}</span>
                </div>
                {inv.approver && (
                  <div className="mt-2 text-xs text-zinc-600">
                    {inv.status === 'ACCEPTED' ? '✅' : '❌'} {inv.approver.username} — {inv.approvedAt ? format(new Date(inv.approvedAt), 'dd MMM HH:mm', { locale: ro }) : ''}
                  </div>
                )}
              </div>
              {session?.user.isLeadership && inv.status === 'PENDING' && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => review(inv.id, 'ACCEPTED')} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors border border-green-500/20"><Check size={14} /></button>
                  <button onClick={() => review(inv.id, 'REJECTED')} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"><X size={14} /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
