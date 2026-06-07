'use client'
import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

interface Member { id: string; username: string; points: number }
interface HistEntry { id: string; amount: number; reason: string; createdAt: string; user: { username: string }; moderator: { username: string } }

export default function LeaderPunctePage() {
  const [members, setMembers]   = useState<Member[]>([])
  const [history, setHistory]   = useState<HistEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [submitting, setSub]    = useState(false)
  const [form, setForm]         = useState({ targetUserId: '', amount: '', reason: '' })
  const [msg, setMsg]           = useState('')

  const load = useCallback(async () => {
    const [mr, hr] = await Promise.all([fetch('/api/members'), fetch('/api/points?userId=all')])
    const md = await mr.json()
    setMembers(md.members || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!form.targetUserId || !form.amount || !form.reason) { setMsg('Completează toate câmpurile!'); return }
    setSub(true)
    const r = await fetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const d = await r.json()
    if (r.ok) {
      setMsg(`✅ ${parseInt(form.amount) > 0 ? '+' : ''}${form.amount} puncte acordate lui ${d.user.username}!`)
      setForm({ targetUserId: '', amount: '', reason: '' })
      await load()
    } else { setMsg('❌ Eroare: ' + d.error) }
    setSub(false)
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black text-white">Gestionare Puncte</h1>
        <p className="text-zinc-500 text-sm mt-1">Acordă sau retrage puncte membrilor</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="grove-card">
          <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-4">🪙 Modifică Puncte</h2>
          {msg && <div className="mb-4 p-3 bg-dark-hover rounded-lg text-sm text-grove-green">{msg}</div>}
          <div className="space-y-4">
            <div>
              <label className="grove-label">Membrul</label>
              <select className="grove-select" value={form.targetUserId} onChange={e => setForm(f => ({ ...f, targetUserId: e.target.value }))}>
                <option value="">Selectează membrul...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.username} — {m.points} pts</option>)}
              </select>
            </div>
            <div>
              <label className="grove-label">Puncte (pozitiv = acordă, negativ = retrage)</label>
              <input type="number" className="grove-input" placeholder="ex: 100 sau -50"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="grove-label">Motiv</label>
              <input type="text" className="grove-input" placeholder="ex: Activitate exemplară"
                value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <button onClick={submit} disabled={submitting} className="grove-btn w-full">
              {submitting ? 'Se aplică...' : '✓ Aplică Puncte'}
            </button>
          </div>
        </div>

        {/* Members ranking */}
        <div className="grove-card">
          <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-4">🏆 Clasament Puncte</h2>
          {loading ? <div className="text-zinc-600 text-center py-6">Se încarcă...</div> : (
            <div className="space-y-2">
              {members.sort((a,b) => b.points - a.points).map((m, i) => (
                <div key={m.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-dark-hover transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black w-7 text-center ${i===0?'text-yellow-400':i===1?'text-zinc-400':i===2?'text-amber-600':'text-zinc-600'}`}>{i+1}</span>
                    <span className="text-sm text-zinc-300">{m.username}</span>
                  </div>
                  <span className="text-yellow-400 font-bold">{m.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
