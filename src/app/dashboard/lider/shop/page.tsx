'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit3, Save, X, Package } from 'lucide-react'

interface ShopItem {
  id: string; name: string; description: string | null
  imageUrl: string | null; price: number; stock: number; active: boolean
}

const EMPTY: Omit<ShopItem, 'id' | 'active'> = { name: '', description: '', imageUrl: '', price: 0, stock: -1 }

export default function LiderShopPage() {
  const [items, setItems]     = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState({ ...EMPTY })
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/shop')
    const d = await r.json()
    setItems(d.items || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  const addItem = async () => {
    if (!form.name.trim() || !form.price) { showMsg('⚠️ Completează numele și prețul!'); return }
    setSaving(true)
    const r = await fetch('/api/shop', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    if (r.ok) { showMsg('✅ Produs adăugat!'); setForm({ ...EMPTY }); await load() }
    else       { showMsg('❌ Eroare la adăugare') }
    setSaving(false)
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Ștergi produsul?')) return
    await fetch(`/api/shop/${id}`, { method: 'DELETE' })
    showMsg('🗑️ Produs șters!')
    await load()
  }

  const startEdit = (item: ShopItem) => {
    setEditing(item.id)
    setForm({ name: item.name, description: item.description || '', imageUrl: item.imageUrl || '', price: item.price, stock: item.stock })
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    await fetch(`/api/shop/${editing}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    setEditing(null)
    showMsg('✅ Produs actualizat!')
    await load()
    setSaving(false)
  }

  const F = ({ label, field, type = 'text', placeholder = '' }: { label: string; field: keyof typeof form; type?: string; placeholder?: string }) => (
    <div>
      <label className="grove-label">{label}</label>
      <input
        type={type}
        className="grove-input text-sm"
        placeholder={placeholder}
        value={form[field] as string | number}
        onChange={e => setForm(f => ({ ...f, [field]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
      />
    </div>
  )

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black text-white">Gestionare Shop</h1>
        <p className="text-zinc-500 text-sm mt-1">Adaugă și editează produsele din shop</p>
      </div>

      {msg && <div className="p-3 bg-dark-hover rounded-xl text-sm text-grove-green border border-grove-border">{msg}</div>}

      {/* Form adaugare */}
      <div className="grove-card">
        <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-4">
          {editing ? '✏️ Editează Produs' : '+ Adaugă Produs Nou'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <F label="Nume Produs *"     field="name"        placeholder="ex: 20x Injectii Adrenalina" />
          <F label="Preț (puncte) *"   field="price"       type="number" placeholder="50" />
          <F label="URL Imagine"       field="imageUrl"    placeholder="https://..." />
          <F label="Stoc (-1 = infinit)" field="stock"     type="number" placeholder="-1" />
          <div className="md:col-span-2">
            <F label="Descriere (opțional)" field="description" placeholder="ex: 20 de injectii cu adrenalina..." />
          </div>
        </div>

        {/* Preview imagine */}
        {form.imageUrl && (
          <div className="mt-3 p-3 bg-dark-hover rounded-xl border border-dark-border">
            <div className="text-xs text-zinc-600 mb-2">Preview imagine:</div>
            <img src={form.imageUrl} alt="preview" className="h-24 object-contain rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        )}

        <div className="flex gap-3 mt-4">
          {editing ? (
            <>
              <button onClick={saveEdit} disabled={saving} className="grove-btn flex items-center gap-2 text-sm">
                <Save size={14} /> {saving ? 'Se salvează...' : 'Salvează'}
              </button>
              <button onClick={() => { setEditing(null); setForm({ ...EMPTY }) }} className="grove-btn-outline flex items-center gap-2 text-sm">
                <X size={14} /> Anulare
              </button>
            </>
          ) : (
            <button onClick={addItem} disabled={saving} className="grove-btn flex items-center gap-2 text-sm">
              <Plus size={14} /> {saving ? 'Se adaugă...' : 'Adaugă Produs'}
            </button>
          )}
        </div>
      </div>

      {/* Lista produse */}
      <div className="grove-card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-dark-border">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">{items.length} Produse Active</h2>
        </div>
        {loading ? (
          <div className="text-center py-10 text-zinc-600">Se încarcă...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-10">
            <Package size={36} className="text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-600 text-sm">Niciun produs adăugat</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-border/50">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-dark-hover transition-colors">
                {/* Imagine mica */}
                <div className="w-12 h-12 rounded-xl bg-dark-muted border border-dark-border flex items-center justify-center shrink-0 overflow-hidden">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <Package size={20} className="text-zinc-600" />
                  }
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{item.name}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-grove-green text-xs font-bold">{item.price} pts</span>
                    <span className="text-zinc-600 text-xs">Stoc: {item.stock === -1 ? '∞' : item.stock}</span>
                  </div>
                </div>
                {/* Actiuni */}
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(item)}
                    className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors">
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => deleteItem(item.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
