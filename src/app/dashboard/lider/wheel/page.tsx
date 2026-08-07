'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Settings, Package, Coins, Edit3, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

interface Prize { id: string; label: string; type: string; value: number; chance: number; color: string; itemId: string | null }
interface ShopItem { id: string; name: string; price: number; imageUrl: string | null; stock: number }
interface Spin { id: string; prizeLabel: string; cost: number; createdAt: string; user: { username: string } }

const COLORS = ['#00ff66','#ffd600','#ef5350','#29b6f6','#ab47bc','#ff7043','#26c6da','#d4e157']

export default function LiderWheelPage() {
  const [prizes, setPrizes]     = useState<Prize[]>([])
  const [shopItems, setShop]    = useState<ShopItem[]>([])
  const [spins, setSpins]       = useState<Spin[]>([])
  const [spinCost, setSpinCost] = useState(10)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [tab, setTab]           = useState<'premii'|'config'|'istoric'>('premii')
  const [prizeKind, setPrizeKind] = useState<'points' | 'shop'>('points')
  const [label, setLabel]   = useState('')
  const [value, setValue]   = useState('10')
  const [itemId, setItemId] = useState('')
  const [chance, setChance] = useState('10')
  const [color, setColor]   = useState(COLORS[0])

  // Editare
  const [editing, setEditing]       = useState<string | null>(null)
  const [editLabel, setEditLabel]   = useState('')
  const [editValue, setEditValue]   = useState('10')
  const [editChance, setEditChance] = useState('10')
  const [editColor, setEditColor]   = useState(COLORS[0])

  const resetForm = () => { setPrizeKind('points'); setLabel(''); setValue('10'); setItemId(''); setChance('10'); setColor(COLORS[0]) }

  const load = useCallback(async () => {
    const wRes  = await fetch('/api/wheel/admin')
    const wData = await wRes.json()
    setPrizes(wData.prizes     || [])
    setSpinCost(wData.spinCost || 10)
    setSpins(wData.spins       || [])
    setShop(wData.shopItems    || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  const totalWeight  = prizes.reduce((a, p) => a + p.chance, 0)
  const getRealChance = (weight: number) =>
    totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) : '0'

  const handleSelectItem = (id: string) => {
    setItemId(id)
    const item = shopItems.find(i => i.id === id)
    if (item) setLabel(item.name)
  }

  const addPrize = async () => {
    if (prizeKind === 'points' && !label.trim()) { showMsg('⚠️ Completează eticheta!'); return }
    if (prizeKind === 'shop' && !itemId)          { showMsg('⚠️ Selectează un produs din shop!'); return }
    if (!chance || parseInt(chance) < 1)          { showMsg('⚠️ Ponderea trebuie să fie cel puțin 1!'); return }
    setSaving(true)
    const finalLabel = prizeKind === 'shop' ? (shopItems.find(i => i.id === itemId)?.name || label) : label
    const r = await fetch('/api/wheel/admin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        label: finalLabel,
        type:  prizeKind === 'shop' ? 'item' : 'points',
        value: prizeKind === 'shop' ? 0 : parseInt(value),
        itemId: prizeKind === 'shop' ? itemId : null,
        chance: parseInt(chance),
        color,
      }),
    })
    if (r.ok) { showMsg('✅ Premiu adăugat!'); resetForm(); await load() }
    else       { showMsg('❌ Eroare') }
    setSaving(false)
  }

  const startEdit = (p: Prize) => {
    setEditing(p.id)
    setEditLabel(p.label)
    setEditValue(String(p.value))
    setEditChance(String(p.chance))
    setEditColor(p.color)
  }

  const saveEdit = async (id: string) => {
    setSaving(true)
    const r = await fetch(`/api/wheel/admin/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        label:  editLabel,
        value:  parseInt(editValue)  || 0,
        chance: parseInt(editChance) || 10,
        color:  editColor,
      }),
    })
    if (r.ok) { showMsg('✅ Premiu actualizat!'); setEditing(null); await load() }
    else       { showMsg('❌ Eroare la salvare') }
    setSaving(false)
  }

  const deletePrize = async (id: string) => {
    await fetch('/api/wheel/admin', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    showMsg('🗑️ Premiu șters!')
    await load()
  }

  const saveCost = async () => {
    setSaving(true)
    await fetch('/api/wheel/admin', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spinCost })
    })
    showMsg('✅ Cost salvat!')
    setSaving(false)
  }

  const getItemImage = (itemId: string | null) => shopItems.find(i => i.id === itemId)?.imageUrl || null

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black text-white">🎰 Fortune Wheel — Lider</h1>
        <p className="text-zinc-500 text-sm mt-1">Configurează roata norocului</p>
      </div>

      <div className="flex gap-1 border-b border-dark-border">
        {(['premii','config','istoric'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition-all ${
              tab === t ? 'text-grove-green border-b-2 border-grove-green' : 'text-zinc-500 hover:text-white'
            }`}>
            {t === 'premii' ? '🏆 Premii' : t === 'config' ? '⚙️ Configurare' : '📜 Istoric'}
          </button>
        ))}
      </div>

      {msg && <div className="p-3 bg-dark-hover rounded-xl text-sm text-grove-green border border-grove-border">{msg}</div>}

      {tab === 'premii' && (
        <div className="space-y-4">
          <div className="grove-card">
            <p className="text-xs text-zinc-500 leading-relaxed">
              💡 <strong className="text-zinc-300">Sistem de ponderi</strong> — nu mai există limita de 100%.
              Poți pune oricâte premii cu orice valoare. Șansa reală se calculează automat:
              dacă ai 3 premii cu ponderile <strong className="text-white">10, 20, 10</strong> → șansele reale vor fi <strong className="text-white">25%, 50%, 25%</strong>.
              Cu cât ponderea e mai mare, cu atât premiul apare mai des.
            </p>
          </div>

          <div className="grove-card space-y-3">
            <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest">+ Adaugă Premiu</h2>
            <div className="flex gap-2">
              <button onClick={() => setPrizeKind('points')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  prizeKind === 'points' ? 'bg-grove-dim text-grove-green border-grove-border' : 'bg-dark-hover text-zinc-500 border-dark-border'
                }`}>
                <Coins size={14} /> Grove Coins
              </button>
              <button onClick={() => setPrizeKind('shop')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  prizeKind === 'shop' ? 'bg-grove-dim text-grove-green border-grove-border' : 'bg-dark-hover text-zinc-500 border-dark-border'
                }`}>
                <Package size={14} /> Produs din Shop
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {prizeKind === 'points' ? (
                <>
                  <div>
                    <label className="grove-label">Etichetă *</label>
                    <input className="grove-input text-sm" placeholder="ex: 50 Coins"
                      value={label} onChange={e => setLabel(e.target.value)} />
                  </div>
                  <div>
                    <label className="grove-label">Puncte acordate</label>
                    <input type="number" className="grove-input text-sm" placeholder="50"
                      value={value} onChange={e => setValue(e.target.value)} />
                  </div>
                </>
              ) : (
                <div className="md:col-span-2">
                  <label className="grove-label">Produs din Shop *</label>
                  <select className="grove-select text-sm" value={itemId} onChange={e => handleSelectItem(e.target.value)}>
                    <option value="">Selectează produs...</option>
                    {shopItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.price} pts)</option>)}
                  </select>
                  {itemId && getItemImage(itemId) && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={getItemImage(itemId)!} alt="" className="w-12 h-12 rounded-lg object-cover border border-grove-border" />
                      <span className="text-xs text-zinc-500">Poza va apărea pe roată</span>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="grove-label">Pondere (orice număr pozitiv)</label>
                <input type="number" min="1" className="grove-input text-sm"
                  placeholder="ex: 10 (mai mare = mai des)"
                  value={chance} onChange={e => setChance(e.target.value)} />
              </div>
              <div>
                <label className="grove-label">Culoare (fallback fără poză)</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <button onClick={addPrize} disabled={saving} className="grove-btn flex items-center gap-2 text-sm">
              <Plus size={14} /> {saving ? 'Se adaugă...' : 'Adaugă Premiu'}
            </button>
          </div>

          <div className="grove-card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">{prizes.length} Premii</h2>
              {totalWeight > 0 && (
                <span className="text-xs text-zinc-600">Total pondere: <strong className="text-white">{totalWeight}</strong></span>
              )}
            </div>
            {prizes.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">Niciun premiu adăugat</div>
            ) : (
              <div className="divide-y divide-dark-border/50">
                {prizes.map(p => (
                  <div key={p.id} className="px-5 py-3 hover:bg-dark-hover transition-colors">
                    {editing === p.id ? (
                      // Form editare inline
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="grove-label">Etichetă</label>
                            <input className="grove-input text-sm" value={editLabel}
                              onChange={e => setEditLabel(e.target.value)} />
                          </div>
                          <div>
                            <label className="grove-label">Valoare (pts)</label>
                            <input type="number" className="grove-input text-sm" value={editValue}
                              onChange={e => setEditValue(e.target.value)} />
                          </div>
                          <div>
                            <label className="grove-label">Pondere</label>
                            <input type="number" className="grove-input text-sm" value={editChance}
                              onChange={e => setEditChance(e.target.value)} />
                          </div>
                          <div className="col-span-2">
                            <label className="grove-label">Culoare</label>
                            <div className="flex gap-2 flex-wrap mt-1">
                              {COLORS.map(c => (
                                <button key={c} onClick={() => setEditColor(c)}
                                  className={`w-8 h-8 rounded-lg border-2 transition-all ${editColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                                  style={{ background: c }} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(p.id)} disabled={saving}
                            className="grove-btn flex items-center gap-2 text-xs">
                            <Save size={12} /> {saving ? 'Se salvează...' : 'Salvează'}
                          </button>
                          <button onClick={() => setEditing(null)}
                            className="grove-btn-outline flex items-center gap-2 text-xs">
                            <X size={12} /> Anulare
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Afisare normala
                      <div className="flex items-center gap-3">
                        {p.itemId && getItemImage(p.itemId) ? (
                          <img src={getItemImage(p.itemId)!} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-grove-border shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full shrink-0" style={{ background: p.color }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium">{p.label}</div>
                          <div className="text-xs text-zinc-600">
                            {p.type === 'points' ? `+${p.value} pts` : 'Item shop'}
                            {' · '}
                            <span className="text-grove-green font-semibold">{getRealChance(p.chance)}% șansă reală</span>
                            <span className="text-zinc-700"> (pondere: {p.chance})</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => startEdit(p)}
                            className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => deletePrize(p.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div className="grove-card max-w-sm space-y-4">
          <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest flex items-center gap-2">
            <Settings size={14} /> Cost Spin
          </h2>
          <div>
            <label className="grove-label">Puncte necesare per spin</label>
            <input type="number" min="0" className="grove-input" value={spinCost}
              onChange={e => setSpinCost(parseInt(e.target.value) || 0)} />
          </div>
          <button onClick={saveCost} disabled={saving} className="grove-btn w-full text-sm">
            {saving ? 'Se salvează...' : '💾 Salvează'}
          </button>
        </div>
      )}

      {tab === 'istoric' && (
        <div className="grove-card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-dark-border">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">Ultimele 50 Spinuri</h2>
          </div>
          {spins.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-sm">Niciun spin efectuat</div>
          ) : (
            <div className="divide-y divide-dark-border/50">
              {spins.map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-dark-hover transition-colors">
                  <div>
                    <div className="text-white text-sm font-medium">{s.user.username}</div>
                    <div className="text-xs text-zinc-600">🏆 {s.prizeLabel} · -{s.cost} pts</div>
                  </div>
                  <div className="text-xs text-zinc-600">
                    {format(new Date(s.createdAt), 'dd MMM HH:mm', { locale: ro })}
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
