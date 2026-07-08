'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Edit3, Save, X, Package, History } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Image from 'next/image'

interface ShopItem {
  id: string; name: string; description: string | null
  imageUrl: string | null; price: number; stock: number; active: boolean
}
interface Order {
  id: string; quantity: number; createdAt: string
  user: { username: string; avatar: string | null }
  item: { name: string; imageUrl: string | null; price: number }
}

export default function LiderShopPage() {
  const [items, setItems]       = useState<ShopItem[]>([])
  const [orders, setOrders]     = useState<Order[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg]           = useState('')
  const [editing, setEditing]   = useState<string | null>(null)
  const [tab, setTab]           = useState<'produse' | 'istoric'>('produse')
  const fileInputRef            = useRef<HTMLInputElement>(null)

  const [name, setName]         = useState('')
  const [description, setDesc]  = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [price, setPrice]       = useState('')
  const [stock, setStock]       = useState('-1')

  const resetForm = () => {
    setName(''); setDesc(''); setImageUrl(''); setPrice(''); setStock('-1')
    setEditing(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const load = useCallback(async () => {
    const r = await fetch('/api/shop')
    const d = await r.json()
    setItems(d.items || [])
    setLoading(false)
  }, [])

  const loadOrders = useCallback(async () => {
    const r = await fetch('/api/shop/orders')
    const d = await r.json()
    setOrders(d.orders || [])
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (tab === 'istoric') loadOrders() }, [tab, loadOrders])

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const r = await fetch('/api/upload', { method: 'POST', body: formData })
    const d = await r.json()
    if (r.ok) { setImageUrl(d.url); showMsg('✅ Poză încărcată!') }
    else       { showMsg(`❌ Eroare: ${d.error}`) }
    setUploading(false)
  }

  const addItem = async () => {
    if (!name.trim() || !price) { showMsg('⚠️ Completează numele și prețul!'); return }
    setSaving(true)
    const r = await fetch('/api/shop', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, description, imageUrl, price: parseInt(price), stock: parseInt(stock) }),
    })
    if (r.ok) { showMsg('✅ Produs adăugat!'); resetForm(); await load() }
    else       { showMsg('❌ Eroare la adăugare') }
    setSaving(false)
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    await fetch(`/api/shop/${editing}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, description, imageUrl, price: parseInt(price), stock: parseInt(stock) }),
    })
    showMsg('✅ Produs actualizat!')
    resetForm()
    await load()
    setSaving(false)
  }

  const startEdit = (item: ShopItem) => {
    setEditing(item.id)
    setName(item.name)
    setDesc(item.description || '')
    setImageUrl(item.imageUrl || '')
    setPrice(String(item.price))
    setStock(String(item.stock))
  }

  const deleteItem = async (id: string) => {
    await fetch(`/api/shop/${id}`, { method: 'DELETE' })
    showMsg('🗑️ Produs șters!')
    await load()
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black text-white">Gestionare Shop</h1>
        <p className="text-zinc-500 text-sm mt-1">Adaugă produse și vezi istoricul comenzilor</p>
      </div>

      <div className="flex gap-1 border-b border-dark-border">
        <button onClick={() => setTab('produse')}
          className={`px-5 py-2.5 text-sm font-medium transition-all ${
            tab === 'produse' ? 'text-grove-green border-b-2 border-grove-green' : 'text-zinc-500 hover:text-white'
          }`}>
          <Package size={14} className="inline mr-2" />Produse
        </button>
        <button onClick={() => setTab('istoric')}
          className={`px-5 py-2.5 text-sm font-medium transition-all ${
            tab === 'istoric' ? 'text-grove-green border-b-2 border-grove-green' : 'text-zinc-500 hover:text-white'
          }`}>
          <History size={14} className="inline mr-2" />Istoric Comenzi
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-dark-hover rounded-xl text-sm text-grove-green border border-grove-border">{msg}</div>
      )}

      {tab === 'produse' && (
        <>
          <div className="grove-card">
            <h2 className="text-sm font-semibold text-grove-green uppercase tracking-widest mb-4">
              {editing ? '✏️ Editează Produs' : '+ Adaugă Produs Nou'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="grove-label">Nume Produs *</label>
                <input className="grove-input text-sm" placeholder="ex: 20x Injectii Adrenalina"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="grove-label">Preț (puncte) *</label>
                <input type="number" className="grove-input text-sm" placeholder="50"
                  value={price} onChange={e => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="grove-label">Imagine Produs</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="grove-input text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-grove-dim file:text-grove-green file:text-xs file:font-semibold file:cursor-pointer hover:file:bg-grove-dim/70"
                />
                {uploading && <p className="text-xs text-zinc-500 mt-1">Se încarcă...</p>}
              </div>
              <div>
                <label className="grove-label">Stoc (-1 = infinit)</label>
                <input type="number" className="grove-input text-sm" placeholder="-1"
                  value={stock} onChange={e => setStock(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="grove-label">Descriere (opțional)</label>
                <input className="grove-input text-sm" placeholder="ex: 20 de injectii cu adrenalina..."
                  value={description} onChange={e => setDesc(e.target.value)} />
              </div>
            </div>

            {imageUrl && (
              <div className="mt-3 p-3 bg-dark-hover rounded-xl border border-dark-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-zinc-600">Preview:</div>
                  <button onClick={() => setImageUrl('')} className="text-xs text-red-400 hover:underline">Șterge poza</button>
                </div>
                <img src={imageUrl} alt="preview" className="h-24 object-contain rounded-lg" />
              </div>
            )}

            <div className="flex gap-3 mt-4">
              {editing ? (
                <>
                  <button onClick={saveEdit} disabled={saving} className="grove-btn flex items-center gap-2 text-sm">
                    <Save size={14} /> {saving ? 'Se salvează...' : 'Salvează'}
                  </button>
                  <button onClick={resetForm} className="grove-btn-outline flex items-center gap-2 text-sm">
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

          <div className="grove-card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-border">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">
                {items.length} Produse Active
              </h2>
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
                    <div className="w-12 h-12 rounded-xl bg-dark-muted border border-dark-border flex items-center justify-center shrink-0 overflow-hidden">
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" />
                        : <Package size={20} className="text-zinc-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm truncate">{item.name}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-grove-green text-xs font-bold">{item.price} pts</span>
                        <span className="text-zinc-600 text-xs">Stoc: {item.stock === -1 ? '∞' : item.stock}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => startEdit(item)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => deleteItem(item.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'istoric' && (
        <div className="grove-card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-dark-border">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">
              Ultimele 50 Comenzi
            </h2>
          </div>
          {orders.length === 0 ? (
            <div className="text-center py-10 text-zinc-600 text-sm">Nicio comandă încă</div>
          ) : (
            <div className="divide-y divide-dark-border/50">
              {orders.map(o => (
                <div key={o.id} className="flex items-center gap-3 px-5 py-3 hover:bg-dark-hover transition-colors">
                  <div className="w-9 h-9 rounded-full border border-dark-border overflow-hidden bg-dark-muted flex items-center justify-center shrink-0">
                    {o.user.avatar
                      ? <Image src={o.user.avatar} alt={o.user.username} width={36} height={36} className="object-cover" unoptimized />
                      : <span className="text-sm">👤</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold">{o.user.username}</div>
                    <div className="text-xs text-zinc-500">
                      {o.quantity > 1 ? `${o.quantity}x ` : ''}{o.item.name}
                      <span className="text-grove-green ml-2 font-semibold">-{o.item.price * o.quantity} pts</span>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-600 shrink-0">
                    {format(new Date(o.createdAt), 'dd MMM HH:mm', { locale: ro })}
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
