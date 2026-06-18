'use client'
import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Plus, Trash2, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Image from 'next/image'

interface Fine {
  id: string; material: string; bucati: number; termen: string
  fwLevel: number | null; givenByName: string; createdAt: string
  user: { username: string; avatar: string | null; discordId: string }
}
interface Member { id: string; username: string; avatar: string | null; discordId: string }

const LEADER_ROLES = ['955126889171804170', '955126890472022066']

export default function LiderAmenziPage() {
  const [fines, setFines]       = useState<Fine[]>([])
  const [members, setMembers]   = useState<Member[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [isLeader, setIsLeader] = useState(false)

  const [userId, setUserId]     = useState('')
  const [material, setMaterial] = useState('')
  const [bucati, setBucati]     = useState('')
  const [termen, setTermen]     = useState('')
  const [fwLevel, setFwLevel]   = useState('0')

  const resetForm = () => { setUserId(''); setMaterial(''); setBucati(''); setTermen(''); setFwLevel('0') }

  const load = useCallback(async () => {
    const r = await fetch('/api/amenzi/admin')
    const d = await r.json()
    setFines(d.fines     || [])
    setMembers(d.members || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(d => {
        const roles = d?.user?.roleIds || []
        setIsLeader(roles.some((r: string) => LEADER_ROLES.includes(r)))
      })
  }, [])

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  const submit = async () => {
    if (!userId || !material.trim()) { showMsg('⚠️ Selectează membrul și completează materialul!'); return }
    setSaving(true)
    const r = await fetch('/api/amenzi', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        userId, material,
        bucati:  parseInt(bucati) || 0,
        termen,
        fwLevel: parseInt(fwLevel) || null,
      }),
    })
    if (r.ok) { showMsg('✅ Amendă aplicată! Userul a fost notificat.'); resetForm(); await load() }
    else       { showMsg('❌ Eroare la aplicare') }
    setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('Ștergi amenda?')) return
    await fetch('/api/amenzi/admin', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    showMsg('🗑️ Amendă ștearsă!')
    await load()
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <AlertTriangle size={28} className="text-red-400" /> Amenzi
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Aplică amenzi și Faction Warn-uri</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-zinc-600 hover:text-grove-green hover:bg-grove-dim transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {msg && <div className="p-3 bg-dark-hover rounded-xl text-sm text-grove-green border border-grove-border">{msg}</div>}

      <div className="grove-card space-y-3">
        <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest">+ Aplică Amendă</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="grove-label">Membru *</label>
            <select className="grove-select text-sm" value={userId} onChange={e => setUserId(e.target.value)}>
              <option value="">Selectează membru...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="grove-label">Material / Tip Amendă *</label>
            <input className="grove-input text-sm" placeholder="ex: Posesie ilegală armă"
              value={material} onChange={e => setMaterial(e.target.value)} />
          </div>
          <div>
            <label className="grove-label">Bucăți</label>
            <input type="number" className="grove-input text-sm" placeholder="0"
              value={bucati} onChange={e => setBucati(e.target.value)} />
          </div>
          <div>
            <label className="grove-label">Termen</label>
            <input className="grove-input text-sm" placeholder="ex: 24h"
              value={termen} onChange={e => setTermen(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="grove-label">Faction Warn (opțional)</label>
            <select className="grove-select text-sm" value={fwLevel} onChange={e => setFwLevel(e.target.value)}>
              <option value="0">Fără FW</option>
              <option value="1">FW 1/3</option>
              <option value="2">FW 2/3</option>
              <option value="3">FW 3/3</option>
            </select>
          </div>
        </div>
        <button onClick={submit} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-sm font-semibold transition-all disabled:opacity-50">
          <Plus size={14} /> {saving ? 'Se aplică...' : 'Aplică Amendă'}
        </button>
      </div>

      <div className="grove-card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-dark-border">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">Ultimele Amenzi</h2>
        </div>
        {loading ? (
          <div className="text-center py-8 text-zinc-600">Se încarcă...</div>
        ) : fines.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 text-sm">Nicio amendă aplicată</div>
        ) : (
          <div className="divide-y divide-dark-border/50">
            {fines.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-5 py-3 hover:bg-dark-hover transition-colors">
                <div className="w-9 h-9 rounded-full border border-dark-border overflow-hidden bg-dark-muted flex items-center justify-center shrink-0">
                  {f.user.avatar
                    ? <Image src={f.user.avatar} alt="" width={36} height={36} className="object-cover" unoptimized />
                    : <span className="text-sm">👤</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm">{f.user.username}</div>
                  <div className="text-xs text-zinc-500 flex items-center gap-2 flex-wrap">
                    <span>{f.material}</span>
                    {f.bucati > 0 && <span>· {f.bucati} buc</span>}
                    {f.termen && <span>· {f.termen}</span>}
                    {f.fwLevel && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold">
                        FW {f.fwLevel}/3
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-700 mt-0.5">
                    {f.givenByName} · {format(new Date(f.createdAt), 'dd MMM HH:mm', { locale: ro })}
                  </div>
                </div>
                {isLeader && (
                  <button onClick={() => remove(f.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 shrink-0">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
