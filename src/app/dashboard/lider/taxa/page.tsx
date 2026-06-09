'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Save, Users } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Image from 'next/image'

interface TaxItem { id?: string; name: string; neoficial: number; oficial: number }
interface Payment {
  id: string; paid: boolean; paidAt: string | null
  user: { username: string; avatar: string | null; discordId: string }
}
interface Member { id: string; username: string; avatar: string | null; discordId: string }

export default function LiderTaxaPage() {
  const [items, setItems]       = useState<TaxItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [members, setMembers]   = useState<Member[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [tab, setTab]           = useState<'seteaza'|'status'>('seteaza')

  const load = useCallback(async () => {
    const r = await fetch('/api/taxa/admin')
    const d = await r.json()
    setItems(d.items?.length ? d.items : [{ name: '', neoficial: 0, oficial: 0 }])
    setPayments(d.payments || [])
    setMembers(d.members || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addItem  = () => setItems(i => [...i, { name: '', neoficial: 0, oficial: 0 }])
  const removeItem = (idx: number) => setItems(i => i.filter((_, j) => j !== idx))
  const updateItem = (idx: number, field: keyof TaxItem, value: string | number) => {
    setItems(prev => prev.map((item, j) => j === idx ? { ...item, [field]: value } : item))
  }

  const save = async () => {
    const valid = items.filter(i => i.name.trim())
    if (!valid.length) { setMsg('⚠️ Adaugă cel puțin un material!'); return }
    setSaving(true)
    const r = await fetch('/api/taxa/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: valid }),
    })
    if (r.ok) {
      setMsg('✅ Taxa săptămânii salvată!')
      await load()
    } else {
      setMsg('❌ Eroare la salvare')
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  // Calculeaza statusul platii per membru
  const paidIds  = new Set(payments.filter(p => p.paid).map(p => p.user.username))
  const paidCount = paidIds.size
  const totalCount = members.length

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black text-white">Taxa Sindicat — Lider</h1>
        <p className="text-zinc-500 text-sm mt-1">Setează materialele săptămânale și monitorizează plățile</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-border pb-1">
        <button onClick={() => setTab('seteaza')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${tab === 'seteaza' ? 'text-grove-green border-b-2 border-grove-green' : 'text-zinc-500 hover:text-white'}`}>
          📋 Setează Taxa
        </button>
        <button onClick={() => setTab('status')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === 'status' ? 'text-grove-green border-b-2 border-grove-green' : 'text-zinc-500 hover:text-white'}`}>
          <Users size={14} /> Status Membri
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-grove-dim text-grove-green border border-grove-border">
            {paidCount}/{totalCount}
          </span>
        </button>
      </div>

      {msg && <div className="p-3 bg-dark-hover rounded-xl text-sm text-grove-green border border-grove-border">{msg}</div>}

      {/* Tab: Seteaza */}
      {tab === 'seteaza' && (
        <div className="grove-card space-y-3">
          <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest">Materiale Săptămâna Curentă</h2>

          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-xs text-zinc-600 uppercase tracking-wider px-1">
            <div className="col-span-5">Material</div>
            <div className="col-span-3 text-center">Neoficial</div>
            <div className="col-span-3 text-center">Oficial</div>
            <div className="col-span-1" />
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <input className="grove-input col-span-5 text-sm" placeholder="Nume material..."
                value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} />
              <input type="number" className="grove-input col-span-3 text-sm text-center" placeholder="0"
                value={item.neoficial || ''} onChange={e => updateItem(idx, 'neoficial', parseInt(e.target.value) || 0)} />
              <input type="number" className="grove-input col-span-3 text-sm text-center" placeholder="0"
                value={item.oficial || ''} onChange={e => updateItem(idx, 'oficial', parseInt(e.target.value) || 0)} />
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

      {/* Tab: Status Membri */}
      {tab === 'status' && (
        <div className="grove-card p-0 overflow-hidden">
          <div className="p-4 border-b border-dark-border flex items-center justify-between">
            <span className="text-sm text-zinc-400">{paidCount} din {totalCount} membri au plătit</span>
            <div className="w-32 h-2 bg-dark-border rounded-full overflow-hidden">
              <div className="h-full bg-grove-green rounded-full transition-all"
                style={{ width: totalCount ? `${(paidCount/totalCount)*100}%` : '0%' }} />
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8 text-zinc-600">Se încarcă...</div>
          ) : (
            <div className="divide-y divide-dark-border/50">
              {members.map(m => {
                const hasPaid = paidIds.has(m.username)
                const payment = payments.find(p => p.user.username === m.username)
                return (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3 hover:bg-dark-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-dark-border overflow-hidden bg-dark-muted flex items-center justify-center shrink-0">
                        {m.avatar
                          ? <Image src={`https://cdn.discordapp.com/avatars/${m.discordId}/${m.avatar}.png`} alt={m.username} width={32} height={32} className="object-cover" />
                          : <span className="text-xs">👤</span>
                        }
                      </div>
                      <span className="text-sm text-white font-medium">{m.username}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasPaid && payment?.paidAt && (
                        <span className="text-xs text-zinc-600">
                          {format(new Date(payment.paidAt), 'dd MMM HH:mm', { locale: ro })}
                        </span>
                      )}
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                        hasPaid
                          ? 'text-green-400 border-green-500/30 bg-green-500/10'
                          : 'text-red-400 border-red-500/30 bg-red-500/10'
                      }`}>
                        {hasPaid ? '✓ Plătit' : '✗ Neplătit'}
                      </span>
                    </div>
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
