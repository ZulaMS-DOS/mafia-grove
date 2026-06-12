'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Check, X, ListTodo, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Image from 'next/image'

interface Task { id: string; title: string; description: string; points: number; stock: number; active: boolean; _count: { claims: number } }
interface Claim {
  id: string; status: string; claimedAt: string
  user: { username: string; avatar: string | null; discordId: string }
  task: { title: string; points: number }
}

export default function LiderTasksPage() {
  const [tasks, setTasks]     = useState<Task[]>([])
  const [pending, setPending] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [reviewing, setReview] = useState<string | null>(null)
  const [msg, setMsg]         = useState('')
  const [tab, setTab]         = useState<'taskuri' | 'pending'>('taskuri')

  // Form
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [points, setPoints]     = useState('10')
  const [stock, setStock]       = useState('-1')

  const resetForm = () => { setTitle(''); setDesc(''); setPoints('10'); setStock('-1') }

  const load = useCallback(async () => {
    const r = await fetch('/api/tasks/admin')
    const d = await r.json()
    setTasks(d.tasks   || [])
    setPending(d.pending || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  const addTask = async () => {
    if (!title.trim() || !description.trim()) { showMsg('⚠️ Completează titlul și descrierea!'); return }
    setSaving(true)
    const r = await fetch('/api/tasks/admin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, description, points: parseInt(points), stock: parseInt(stock) }),
    })
    if (r.ok) { showMsg('✅ Task creat!'); resetForm(); await load() }
    else       { showMsg('❌ Eroare') }
    setSaving(false)
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Ștergi taskul?')) return
    await fetch('/api/tasks/admin', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    showMsg('🗑️ Task șters!')
    await load()
  }

  const review = async (claimId: string, status: 'APPROVED' | 'REJECTED') => {
    setReview(claimId)
    const r = await fetch('/api/tasks/admin', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ claimId, status }),
    })
    if (r.ok) showMsg(status === 'APPROVED' ? '✅ Task aprobat! Punctele au fost acordate.' : '❌ Task respins.')
    await load()
    setReview(null)
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black text-white">Tasks — Lider</h1>
        <p className="text-zinc-500 text-sm mt-1">Creează taskuri și confirmă completările</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-dark-border">
        {(['taskuri', 'pending'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium transition-all flex items-center gap-2 ${
              tab === t ? 'text-grove-green border-b-2 border-grove-green' : 'text-zinc-500 hover:text-white'
            }`}>
            {t === 'taskuri' ? '📋 Taskuri' : (
              <>
                <Clock size={14} /> Pending
                {pending.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {pending.length}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {msg && <div className="p-3 bg-dark-hover rounded-xl text-sm text-grove-green border border-grove-border">{msg}</div>}

      {/* Tab Taskuri */}
      {tab === 'taskuri' && (
        <div className="space-y-4">
          {/* Form */}
          <div className="grove-card space-y-3">
            <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest">+ Task Nou</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="grove-label">Titlu *</label>
                <input className="grove-input text-sm" placeholder="ex: 9 Trabuc"
                  value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="grove-label">Descriere *</label>
                <textarea className="grove-input text-sm resize-none" rows={3}
                  placeholder="ex: Taskul constă în aducerea a 9 trabucuri. Aveți timp până duminică."
                  value={description} onChange={e => setDesc(e.target.value)} />
              </div>
              <div>
                <label className="grove-label">Recompensă (puncte)</label>
                <input type="number" className="grove-input text-sm" placeholder="10"
                  value={points} onChange={e => setPoints(e.target.value)} />
              </div>
              <div>
                <label className="grove-label">Stoc (-1 = nelimitat)</label>
                <input type="number" className="grove-input text-sm" placeholder="-1"
                  value={stock} onChange={e => setStock(e.target.value)} />
              </div>
            </div>
            <button onClick={addTask} disabled={saving} className="grove-btn flex items-center gap-2 text-sm">
              <Plus size={14} /> {saving ? 'Se creează...' : 'Creează Task'}
            </button>
          </div>

          {/* Lista taskuri */}
          <div className="grove-card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-border">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">{tasks.filter(t => t.active).length} Taskuri Active</h2>
            </div>
            {loading ? (
              <div className="text-center py-8 text-zinc-600">Se încarcă...</div>
            ) : tasks.filter(t => t.active).length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">Niciun task creat</div>
            ) : (
              <div className="divide-y divide-dark-border/50">
                {tasks.filter(t => t.active).map(task => (
                  <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-dark-hover transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm">{task.title}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-grove-green text-xs font-bold">+{task.points} pts</span>
                        <span className="text-zinc-600 text-xs">
                          Stoc: {task.stock === -1 ? '∞' : task.stock} · {task._count.claims} preluări
                        </span>
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Pending */}
      {tab === 'pending' && (
        <div className="grove-card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-dark-border">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">
              {pending.length} Cereri de Confirmare
            </h2>
          </div>
          {pending.length === 0 ? (
            <div className="text-center py-10">
              <Check size={36} className="text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-600 text-sm">Nicio cerere pending</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border/50">
              {pending.map(claim => (
                <div key={claim.id} className="flex items-center gap-3 px-5 py-4 hover:bg-dark-hover transition-colors">
                  <div className="w-9 h-9 rounded-full border border-dark-border overflow-hidden bg-dark-muted flex items-center justify-center shrink-0">
                    {claim.user.avatar
                      ? <Image src={`https://cdn.discordapp.com/avatars/${claim.user.discordId}/${claim.user.avatar}.png`}
                          alt={claim.user.username} width={36} height={36} className="object-cover" />
                      : <span className="text-sm">👤</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm">{claim.user.username}</div>
                    <div className="text-xs text-zinc-500">{claim.task.title} · <span className="text-grove-green">+{claim.task.points} pts</span></div>
                    <div className="text-xs text-zinc-700 mt-0.5">
                      {format(new Date(claim.claimedAt), 'dd MMM HH:mm', { locale: ro })}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => review(claim.id, 'APPROVED')} disabled={reviewing === claim.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 text-xs font-semibold disabled:opacity-50">
                      {reviewing === claim.id
                        ? <div className="w-3 h-3 border border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                        : <><Check size={12} /> Aprobă</>
                      }
                    </button>
                    <button onClick={() => review(claim.id, 'REJECTED')} disabled={reviewing === claim.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold disabled:opacity-50">
                      <X size={12} /> Respinge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
