'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Save, Users, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Image from 'next/image'

const GRADE_OPTIONS = [
  { id: '955126889171804170',  label: 'Lider',    color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  { id: '955126890472022066',  label: 'Co-Lider', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
  { id: '1462444900388704317', label: 'Tester',   color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { id: '1501319885488390184', label: 'Membru',   color: 'text-grove-green border-grove-border bg-grove-dim' },
  { id: '1342912254542348298', label: 'Muncitor', color: 'text-zinc-400 border-zinc-600/30 bg-zinc-600/10' },
]

function getGrade(roleIds: string[]) {
  for (const g of GRADE_OPTIONS) {
    if (roleIds.includes(g.id)) return g
  }
  return { label: 'Fără Grad', color: 'text-zinc-600 border-zinc-700/30 bg-zinc-700/10' }
}

interface TaxItem { id?: string; name: string; bucati: number; termen: string; targetRoles: string[] }
interface Payment {
  id: string; paid: boolean; paidAt: string | null
  user: { username: string; avatar: string | null; discordId: string; roleIds: string[] }
}
interface Member { id: string; username: string; avatar: string | null; discordId: string; roleIds: string[] }

export default function LiderTaxaPage() {
  const [items, setItems]       = useState<TaxItem[]>([{ name: '', bucati: 0, termen: '', targetRoles: [] }])
  const [payments, setPayments] = useState<Payment[]>([])
  const [members, setMembers]   = useState<Member[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [msg, setMsg]           = useState('')
  const [tab, setTab]           = useState<'seteaza' | 'status'>('seteaza')

  const itemsRef = useRef<TaxItem[]>(items)
  useEffect(() => { itemsRef.current = items }, [items])

  const load = useCallback(async () => {
    const r = await fetch('/api/taxa/admin')
    const d = await r.json()
    if (d.items?.length) {
      setItems(d.items.map((i: any) => ({
        id:          i.id,
        name:        i.name,
        bucati:      i.bucati,
        termen:      i.termen ? new Date(i.termen).toISOString().split('T')[0] : '',
        targetRoles: i.targetRoles || [],
      })))
    } else {
      setItems([{ name: '', bucati: 0, termen: '', targetRoles: [] }])
    }
    setPayments(d.payments || [])
    setMembers(d.members  || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addItem = () => {
    setItems(prev => [...prev, { name: '', bucati: 0, termen: '', targetRoles: [] }])
  }

  const removeItem = async (idx: number) => {
    const item = items[idx]
    if (item.id) {
      setDeleting(idx)
      await fetch('/api/taxa/admin', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: item.id }),
      })
      setDeleting(null)
      setMsg('🗑️ Material șters!')
      setTimeout(() => setMsg(''), 3000)
    }
    setItems(prev => {
      const next = prev.filter((_, j) => j !== idx)
      return next.length === 0 ? [] : next
    })
  }

  const updateItem = (idx: number, field: keyof TaxItem, value: any) => {
    setItems(prev => prev.map((item, j) => j === idx ? { ...item, [field]: value } : item))
  }

  const toggleRole = (idx: number, roleId: string) => {
    setItems(prev => prev.map((item, j) => {
      if (j !== idx) return item
      const has = item.targetRoles.includes(roleId)
      return {
        ...item,
        targetRoles: has ? item.targetRoles.filter(r => r !== roleId) : [...item.targetRoles, roleId],
      }
    }))
  }

  const save = async () => {
    const valid = itemsRef.current.filter(i => i.name.trim() !== '')
    setSaving(true)
    const r = await fetch('/api/taxa/admin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ items: valid }),
    })
    if (r.ok) {
      setMsg(`✅ Taxa salvată! ${valid.length} materiale.`)
      await load()
    } else {
      setMsg('❌ Eroare la salvare')
    }
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

  const allTargetRoles  = new Set(items.flatMap(i => i.targetRoles))
  const relevantMembers = allTargetRoles.size === 0
    ? members
    : members.filter(m => m.roleIds.some(r => allTargetRoles.has(r)))
  const paidCount  = payments.filter(p => p.paid).length
  const totalCount = relevantMembers.length
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
        <div className="p-3 bg-dark-hover rounded-xl text-sm text-grove-green border border-grove-border">{msg}</div>
      )}

      {tab === 'seteaza' && (
        <div className="grove-card space-y-4">
          <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-2">
            Materiale Săptămâna Curentă
          </h2>

          {items.map((item, idx) => (
            <div key={item.id || idx} className="space-y-2 pb-4 border-b border-dark-border/50 last:border-0">
              <div className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="grove-input col-span-5 text-sm"
                  placeholder="ex: Monede Sindicat"
                  value={item.name}
                  onChange={e => updateItem(idx, 'name', e.target.value)}
                />
                <input
                  type="number" min="0"
                  className="grove-input col-span-2 text-sm text-center"
                  placeholder="0"
                  value={item.bucati || ''}
                  onChange={e => updateItem(idx, 'bucati', parseInt(e.target.value) || 0)}
                />
                <input
                  type="date"
                  className="grove-input col-span-4 text-sm"
                  value={item.termen}
                  onChange={e => updateItem(idx, 'termen', e.target.value)}
                />
                <button
                  onClick={() => removeItem(idx)}
                  disabled={deleting === idx}
                  className="col-span-1 p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center disabled:opacity-50"
                >
                  {deleting === idx
                    ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    : <Trash2 size={13} />
                  }
                </button>
              </div>

              <div>
                <div className="text-xs text-zinc-600 uppercase tracking-wider mb-1.5 px-1">Pentru ce grade?</div>
                <div className="flex flex-wrap gap-2">
                  {GRADE_OPTIONS.map(g => {
                    const checked = item.targetRoles.includes(g.id)
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleRole(idx, g.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          checked ? g.color : 'text-zinc-600 border-dark-border bg-dark-hover'
                        }`}
                      >
                        {checked ? '✓' : ''} {g.label}
                      </button>
                    )
                  })}
                </div>
                {item.targetRoles.length === 0 && (
                  <p className="text-xs text-zinc-700 mt-1">Niciun grad selectat = se aplică tuturor</p>
                )}
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-4 text-zinc-600 text-sm border border-dashed border-dark-border rounded-xl">
              Niciun material. Apasă "Adaugă Material".
            </div>
          )}

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

      {tab === 'status' && (
        <div className="grove-card p-0 overflow-hidden">
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
              {relevantMembers.map(m => {
                const payment    = paidMap.get(m.username)
                const hasPaid    = payment?.paid ?? false
                const isToggling = toggling === m.id
                const grade      = getGrade(m.roleIds)
                return (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3 hover:bg-dark-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full border border-dark-border overflow-hidden bg-dark-muted flex items-center justify-center shrink-0">
                        {m.avatar
                          ? <Image src={m.avatar} alt={m.username} width={36} height={36} className="object-cover" unoptimized />
                          : <span className="text-sm">👤</span>
                        }
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{m.username}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${grade.color}`}>
                            {grade.label}
                          </span>
                          {hasPaid && payment?.paidAt && (
                            <span className="text-xs text-zinc-600">
                              {format(new Date(payment.paidAt), 'dd MMM HH:mm', { locale: ro })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => togglePaid(m.id, hasPaid)}
                      disabled={isToggling}
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        hasPaid
                          ? 'text-green-400 border-green-500/30 bg-green-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                          : 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30'
                      } disabled:opacity-50`}
                    >
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
