'use client'
import { useState, useEffect, useCallback } from 'react'
import { Ban, UserX, UserCheck, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

interface User {
  id: string; username: string; avatar: string | null
  discordId: string; bannedAt?: string; banReason?: string
}

export default function BanPage() {
  const [banned, setBanned]   = useState<User[]>([])
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg]         = useState('')
  const [tab, setTab]         = useState<'ban' | 'banned'>('ban')

  // Form
  const [userId, setUserId]   = useState('')
  const [reason, setReason]   = useState('')
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/ban')
    const d = await r.json()
    setBanned(d.banned   || [])
    setMembers(d.members || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  const banUser = async () => {
    if (!userId) { showMsg('⚠️ Selectează un membru!'); return }
    setSaving(true)
    const r = await fetch('/api/ban', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, reason }),
    })
    if (r.ok) { showMsg('✅ User banat!'); setUserId(''); setReason(''); await load() }
    else       { showMsg('❌ Eroare') }
    setSaving(false)
  }

  const unbanUser = async (id: string) => {
    if (!confirm('Debanezi acest user?')) return
    await fetch('/api/ban', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId: id }),
    })
    showMsg('✅ User debanat!')
    await load()
  }

  const Avatar = ({ user }: { user: User }) => (
    <div className="w-9 h-9 rounded-full border border-dark-border overflow-hidden bg-dark-muted flex items-center justify-center shrink-0">
      {user.avatar
        ? <Image src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`} alt="" width={36} height={36} className="object-cover" />
        : <span className="text-sm">👤</span>
      }
    </div>
  )

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Ban size={28} className="text-red-400" /> Gestionare Acces
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Blochează sau deblochează accesul pe site</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-zinc-600 hover:text-grove-green hover:bg-grove-dim transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {msg && <div className="p-3 bg-dark-hover rounded-xl text-sm text-grove-green border border-grove-border">{msg}</div>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-dark-border">
        {(['ban', 'banned'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium transition-all flex items-center gap-2 ${
              tab === t ? 'text-red-400 border-b-2 border-red-400' : 'text-zinc-500 hover:text-white'
            }`}>
            {t === 'ban' ? <><UserX size={14} /> Banează</>
              : <><UserCheck size={14} /> Banați ({banned.length})</>}
          </button>
        ))}
      </div>

      {/* Tab Ban */}
      {tab === 'ban' && (
        <div className="grove-card space-y-3">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-widest">🚫 Banează User</h2>
          <div className="space-y-3">
            <div>
              <label className="grove-label">Selectează Membru *</label>
              <select className="grove-select text-sm" value={userId} onChange={e => setUserId(e.target.value)}>
                <option value="">Alege un membru...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
              </select>
            </div>
            <div>
              <label className="grove-label">Motiv (opțional)</label>
              <input className="grove-input text-sm" placeholder="ex: Comportament toxic"
                value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <button onClick={banUser} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-sm font-semibold transition-all disabled:opacity-50">
              <UserX size={14} /> {saving ? 'Se banează...' : 'Banează User'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Banati */}
      {tab === 'banned' && (
        <div className="grove-card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-dark-border">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">
              {banned.length} Utilizatori Banați
            </h2>
          </div>
          {loading ? (
            <div className="text-center py-8 text-zinc-600">Se încarcă...</div>
          ) : banned.length === 0 ? (
            <div className="text-center py-10">
              <UserCheck size={36} className="text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-600 text-sm">Niciun user banat</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-border/50">
              {banned.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-dark-hover transition-colors">
                  <Avatar user={u} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm">{u.username}</div>
                    {u.banReason && <div className="text-xs text-zinc-500 mt-0.5">{u.banReason}</div>}
                    {u.bannedAt && (
                      <div className="text-xs text-zinc-700 mt-0.5">
                        {format(new Date(u.bannedAt), 'dd MMM yyyy HH:mm', { locale: ro })}
                      </div>
                    )}
                  </div>
                  <button onClick={() => unbanUser(u.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 text-xs font-semibold">
                    <UserCheck size={12} /> Debanează
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
