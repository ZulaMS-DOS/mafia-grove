'use client'
import { useState, useEffect, useCallback } from 'react'
import { Megaphone, Trash2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

interface Anunt {
  id: string; title: string; content: string
  author: string; createdAt: string; important: boolean
}

export default function LiderAnunturiPage() {
  const [anunturi, setAnunturi]   = useState<Anunt[]>([])
  const [loading, setLoading]     = useState(true)
  const [submitting, setSub]      = useState(false)
  const [msg, setMsg]             = useState('')
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [form, setForm]           = useState({ title: '', content: '', important: false })

  const load = useCallback(async () => {
    const r = await fetch('/api/anunturi')
    const d = await r.json()
    setAnunturi(d.anunturi || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) { showMsg('⚠️ Completează titlul și conținutul!'); return }
    setSub(true)
    const r = await fetch('/api/anunturi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (r.ok) { showMsg('✅ Anunț postat!'); setForm({ title: '', content: '', important: false }); await load() }
    else showMsg('❌ Eroare la postare')
    setSub(false)
  }

  const remove = async (id: string) => {
    const r = await fetch(`/api/anunturi/${id}`, { method: 'DELETE' })
    if (r.ok) { showMsg('🗑️ Anunț șters!'); await load() }
    else {
      const d = await r.json().catch(() => ({}))
      showMsg(`❌ Eroare (${r.status}): ${d.error || 'necunoscută'}`)
    }
    setDeleting(null)
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black text-white">Postează Anunț</h1>
        <p className="text-zinc-500 text-sm mt-1">Anunțurile sunt vizibile tuturor membrilor</p>
      </div>

      <div className="grove-card">
        <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-4">
          <Megaphone size={14} className="inline mr-2" />Anunț Nou
        </h2>
        {msg && <div className="mb-4 p-3 bg-dark-hover rounded-xl text-sm text-grove-green">{msg}</div>}
        <div className="space-y-4">
          <div>
            <label className="grove-label">Titlu</label>
            <input type="text" className="grove-input" placeholder="ex: Ședință organizație..."
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="grove-label">Conținut</label>
            <textarea className="grove-input resize-none" rows={5} placeholder="Scrie anunțul aici..."
              value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="important" className="w-4 h-4 accent-yellow-400"
              checked={form.important} onChange={e => setForm(f => ({ ...f, important: e.target.checked }))} />
            <label htmlFor="important" className="text-sm text-zinc-400 cursor-pointer">⚠️ Marchează ca Important</label>
          </div>
          <button onClick={submit} disabled={submitting} className="grove-btn w-full">
            {submitting ? 'Se postează...' : '📢 Postează Anunț'}
          </button>
        </div>
      </div>

      <div className="grove-card">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">Anunțuri Existente</h2>
        {loading ? (
          <div className="text-center py-6 text-zinc-600">Se încarcă...</div>
        ) : anunturi.length === 0 ? (
          <div className="text-center py-6 text-zinc-600">Niciun anunț</div>
        ) : (
          <div className="space-y-2">
            {anunturi.map(a => (
              <div key={a.id} className="p-3 rounded-xl bg-dark-hover border border-dark-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {a.important && <span className="text-yellow-400 text-xs">⚠️</span>}
                      <span className="text-white text-sm font-semibold truncate">{a.title}</span>
                    </div>
                    <div className="text-xs text-zinc-600 mt-0.5">{format(new Date(a.createdAt), 'dd MMM yyyy HH:mm', { locale: ro })}</div>
                  </div>

                  {deleting === a.id ? (
                    <div className="flex items-center gap-2 shrink-0 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-1.5">
                      <AlertTriangle size={12} className="text-red-400" />
                      <span className="text-red-400 text-xs font-semibold">Sigur?</span>
                      <button onClick={() => remove(a.id)} className="text-xs px-2 py-0.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600">Da</button>
                      <button onClick={() => setDeleting(null)} className="text-xs px-2 py-0.5 rounded-lg bg-dark-border text-zinc-400 hover:text-white">Nu</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleting(a.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 shrink-0">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
