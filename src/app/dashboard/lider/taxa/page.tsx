'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Save, Users, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Image from 'next/image'

interface TaxItem { id?: string; name: string; bucati: number; termen: string }
interface Payment {
  id: string; paid: boolean; paidAt: string | null
  user: { username: string; avatar: string | null; discordId: string }
}
interface Member { id: string; username: string; avatar: string | null; discordId: string }

export default function LiderTaxaPage() {
  const [items, setItems]       = useState<TaxItem[]>([{ name: '', bucati: 0, termen: '' }])
  const [payments, setPayments] = useState<Payment[]>([])
  const [members, setMembers]   = useState<Member[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [msg, setMsg]           = useState('')
  const [tab, setTab]           = useState<'seteaza' | 'status'>('seteaza')

  const load = useCallback(async () => {
    const r = await fetch('/api/taxa/admin')
    const d = await r.json()
    if (d.items?.length) setItems(d.items)
    setPayments(d.payments || [])
    setMembers(d.members  || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addItem    = () => setItems(i => [...i, { name: '', bucati: 0, termen: '' }])
  const removeItem = (idx: number) => setItems(i => i.filter((_, j) => j !== idx))
  const updateItem = (idx: number, field: keyof TaxItem, value: string | number) =>
    setItems(prev => prev.map((item, j) => j === idx ? { ...item, [field]: value } : item))

  const save = async () => {
    const valid = items.filter(i => i.name.trim())
    if (!valid.length) { setMsg('⚠️ Adaugă cel puțin un material!'); return }
    setSaving(true)
    const r = await fetch('/api/taxa/admin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ items: valid }),
    })
    setMsg(r.ok ? '✅ Taxa salvată! Membrii o vor vedea imediat.' : '❌ Eroare la salvare')
    if (r.ok) await load()
    setSaving(false)
    setTimeout(() => setMsg(''), 4000)
  }

  const togglePaid = async (memberId: string, currentPaid: boolean) => {
    setToggling(memberId)
    await fetch('/api/taxa/admin', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId: memberId, paid: !currentPaid }),
    })
    await load()
    setToggling(null)
  }

  const paidCount  = payments.filter(p => p.paid).length
  const totalCount = members.length
  const paidMap    = new Map(payments.map(p => [p.user.username, p]))

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Taxa Sindicat — Lider</h1>
          <p className="text-zinc-500 text-sm mt-1">Setează materialele și marchează plățile</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-zinc-600 hover:text-grove-green hover:bg-grove-dim transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-dark-border">
        {(['seteaza', 'status'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium transition-all ${
              tab === t ? 'text-grove-green border-b-2 border-grove-green' : 'text-zinc-500 hover:text-white'
            }`}>
            {t === 'seteaza' ? '📋 Setează Taxa' : (
              <span className="flex items-center gap-2">
                <Users size={14} /> Status Membri
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-grove-dim text-grove-green border border-grove-border">
                  {paidCount}/{totalCount}
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      {msg && (
        <div className="p-3 bg-dark-hover rounded-xl text-sm text-grove-green border border-grove-border">
          {msg}
        </div>
      )}

      {/* Tab Setează */}
      {tab === 'seteaza' && (
        <div className="grove-card space-y-3">
          <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-2">
            Materiale Săptămâna Curentă
          </h2>

          <div className="grid grid-cols-12 gap-2 text-xs text-zinc-600 uppercase tracking-wider px-1 mb-1">
            <div className="col-span-5">Material</div>
            <div className="col-span-3 text-center">Bucăți</div>
            <div className="col-span-3 text-center">Termen</div>
            <div className="col-span-1" />
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <input className="grove-input col-span-5 text-sm" placeholder="ex: Monede Sindicat"
                value={item.name}
                onChange={e => updateItem(idx, 'name', e.target.value)} />
              <input type="number" min="0" className="grove-input col-span-3 text-sm text-center" placeholder="0"
                value={item.bucati || ''}
                onChange={e => updateItem(idx, 'bucati', parseInt(e.target.value) || 0)} />
              <input className="grove-input col-span-3 text-sm text-center" placeholder="ex: Duminică"
                value={item.termen}
                onChange={e => updateItem(idx, 'termen', e.target.value)} />
              <button onClick={() => removeItem(idx)}
                className="col-span-1 p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center">
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button onClick={addItem} className="grove-btn-outline flex items-center gap-2 text-sm">
              <Plus size={14} /> Adaugă Material
            </button>
            <button onClick={save} disabled={saving} className="grove-btn flex items-center gap-2 text-sm">
              <Save size={14} /> {saving ? 'Se salvează...' : 'Salvează Taxa'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Status */}
      {tab === 'status' && (
        <div className="grove-card p-0 overflow-hidden">
          {/* Progress bar */}
          <div className="px-5 py-3 border-b border-dark-border space-y-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{paidCount} din {totalCount} au plătit</span>
              <span>{totalCount ? Math.round((paidCount/totalCount)*100) : 0}%</span>
            </div>
            <div className="w-full h-2 bg-dark-border rounded-full overflow-hidden">
              <div className="h-full bg-grove-green rounded-full transition-all duration-500"
                style={{ width: totalCount ? `${(paidCount/totalCount)*100}%` : '0%' }} />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-zinc-600">Se încarcă...</div>
          ) : (
            <div className="divide-y divide-dark-border/50">
              {members.map(m => {
                const payment   = paidMap.get(m.username)
                const hasPaid   = payment?.paid ?? false
                const isToggling = toggling === m.id
                return (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3 hover:bg-dark-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full border border-dark-border overflow-hidden bg-dark-muted flex items-center justify-center shrink-0">
                        {m.avatar
                          ? <Image src={`https://cdn.discordapp.com/avatars/${m.discordId}/${m.avatar}.png`} alt={m.username} width={36} height={36} className="object-cover" />
                          : <span className="text-sm">👤</span>
                        }
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{m.username}</div>
                        {hasPaid && payment?.paidAt && (
                          <div className="text-xs text-zinc-600">
                            {format(new Date(payment.paidAt), 'dd MMM HH:mm', { locale: ro })}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => togglePaid(m.id, hasPaid)}
                      disabled={isToggling}
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        hasPaid
                          ? 'text-green-400 border-green-500/30 bg-green-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                          : 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30'
                      } disabled:opacity-50`}>
                      {isToggling
                        ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        : hasPaid ? '✓ Achitat' : '✗ Neachitat'
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
