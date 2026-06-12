'use client'
import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, Clock, XCircle, ListTodo } from 'lucide-react'

interface Task {
  id: string; title: string; description: string
  points: number; stock: number; approvedCount: number
  myStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  isFull: boolean
}

export default function TasksPage() {
  const [tasks, setTasks]     = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [msg, setMsg]         = useState<{ text: string; ok: boolean } | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/tasks')
    const d = await r.json()
    setTasks(d.tasks || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  const claim = async (taskId: string) => {
    setClaiming(taskId)
    const r = await fetch('/api/tasks', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ taskId }),
    })
    const d = await r.json()
    if (r.ok) {
      showMsg('✅ Task preluat! Asteaptă confirmarea Liderului.', true)
      await load()
    } else {
      showMsg(`❌ ${d.error}`, false)
    }
    setClaiming(null)
  }

  const statusBadge = (status: string | null, isFull: boolean) => {
    if (isFull && !status) return <span className="badge-rejected">Stoc Epuizat</span>
    switch (status) {
      case 'PENDING':  return <span className="badge-pending">⏳ În Așteptare</span>
      case 'APPROVED': return <span className="badge-accepted">✅ Aprobat</span>
      case 'REJECTED': return <span className="badge-rejected">❌ Respins</span>
      default:         return null
    }
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <ListTodo size={28} className="text-grove-green" /> Task-uri
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Completează taskuri și câștigă Grove Coins</p>
      </div>

      {msg && (
        <div className={`p-3 rounded-xl text-sm border ${
          msg.ok
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>{msg.text}</div>
      )}

      {loading ? (
        <div className="text-center py-16 text-zinc-600">Se încarcă...</div>
      ) : tasks.length === 0 ? (
        <div className="grove-card text-center py-16">
          <ListTodo size={48} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-600">Niciun task disponibil momentan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map(task => {
            const isClaiming = claiming === task.id
            const canClaim   = !task.myStatus && !task.isFull

            return (
              <div key={task.id}
                className={`grove-card flex flex-col gap-3 ${
                  task.myStatus === 'APPROVED' ? 'border-green-500/30 bg-green-500/5' :
                  task.isFull ? 'opacity-60' : ''
                }`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-white font-bold text-base flex-1">{task.title}</h3>
                  {statusBadge(task.myStatus, task.isFull)}
                </div>

                {/* Descriere */}
                <p className="text-zinc-400 text-sm">{task.description}</p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-dark-border">
                  <div className="flex items-center gap-3">
                    <span className="text-grove-green font-black text-lg">+{task.points} pts</span>
                    {task.stock !== -1 && (
                      <span className="text-xs text-zinc-600 flex items-center gap-1">
                        <ListTodo size={11} />
                        {task.stock - task.approvedCount} rămase
                      </span>
                    )}
                  </div>

                  {canClaim ? (
                    <button onClick={() => claim(task.id)} disabled={isClaiming}
                      className="grove-btn btn-sm flex items-center gap-2 text-sm disabled:opacity-60">
                      {isClaiming
                        ? <div className="w-3 h-3 border border-black/30 border-t-black rounded-full animate-spin" />
                        : <><CheckCircle size={14} /> Preia Task</>
                      }
                    </button>
                  ) : task.myStatus === 'PENDING' ? (
                    <div className="flex items-center gap-1.5 text-xs text-yellow-400">
                      <Clock size={13} /> Aștepți confirmare
                    </div>
                  ) : task.myStatus === 'APPROVED' ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-400">
                      <CheckCircle size={13} /> Completat!
                    </div>
                  ) : task.myStatus === 'REJECTED' ? (
                    <div className="flex items-center gap-1.5 text-xs text-red-400">
                      <XCircle size={13} /> Respins
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
