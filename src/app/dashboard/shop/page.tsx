'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Search, ShoppingCart, Package } from 'lucide-react'
import Image from 'next/image'

interface ShopItem {
  id: string; name: string; description: string | null
  imageUrl: string | null; price: number; stock: number
}

export default function ShopPage() {
  const { data: session }   = useSession()
  const [items, setItems]   = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [buying, setBuying] = useState<string | null>(null)
  const [msg, setMsg]       = useState<{ text: string; type: 'ok' | 'err' } | null>(null)
  const [myPoints, setMyPoints] = useState(0)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    const [shopRes, userRes] = await Promise.all([
      fetch('/api/shop'),
      fetch('/api/points'),
    ])
    const shopData = await shopRes.json()
    const userData = await userRes.json()
    setItems(shopData.items || [])
    setMyPoints(userData.points || 0)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const getQty = (id: string) => quantities[id] || 1
  const setQty = (id: string, val: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, val) }))
  }

  const buy = async (item: ShopItem) => {
    const qty   = getQty(item.id)
    const total = item.price * qty

    if (myPoints < total) {
      setMsg({ text: `Puncte insuficiente! Ai ${myPoints} pts, ai nevoie de ${total} pts.`, type: 'err' })
      setTimeout(() => setMsg(null), 3000)
      return
    }

    setBuying(item.id)
    const r = await fetch(`/api/shop/${item.id}/buy`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ quantity: qty }),
    })
    const d = await r.json()

    if (r.ok) {
      setMsg({ text: `✅ Ai cumpărat ${qty}x ${item.name}! Puncte rămase: ${d.pointsLeft}`, type: 'ok' })
      setMyPoints(d.pointsLeft)
      await load()
    } else {
      setMsg({ text: `❌ ${d.error}`, type: 'err' })
    }
    setBuying(null)
    setTimeout(() => setMsg(null), 4000)
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <ShoppingCart size={28} className="text-grove-green" />
            Grove Shop
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Cumpără iteme cu Grove Coins</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-grove-border rounded-xl">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Puncte disponibile</span>
          <span className="text-grove-green font-black text-lg">{myPoints}</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          type="text"
          className="grove-input pl-10"
          placeholder="Caută produse..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Mesaj */}
      {msg && (
        <div className={`p-3 rounded-xl text-sm border ${
          msg.type === 'ok'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Grid produse */}
      {loading ? (
        <div className="text-center py-16 text-zinc-600">Se încarcă...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-600">{search ? 'Niciun produs găsit' : 'Shopul este gol momentan.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(item => {
            const qty      = getQty(item.id)
            const total    = item.price * qty
            const canAfford = myPoints >= total
            const outOfStock = item.stock === 0
            const isInfinite = item.stock === -1

            return (
              <div key={item.id}
                className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden hover:border-grove-border hover:shadow-[0_0_24px_#00ff6612] transition-all duration-300 flex flex-col">

                {/* Imagine */}
                <div className="relative h-48 bg-dark-hover flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain p-4"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="text-6xl">🛒</div>
                  )}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <span className="text-red-400 font-black text-lg uppercase tracking-widest">Stoc Epuizat</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-white font-bold text-base mb-1">{item.name}</h3>
                  {item.description && (
                    <p className="text-zinc-500 text-xs mb-3 line-clamp-2">{item.description}</p>
                  )}

                  <div className="text-grove-green font-black text-2xl mb-2">
                    {(item.price * qty).toLocaleString()} puncte
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-600 mb-4">
                    <Package size={12} />
                    <span>Stoc: {isInfinite ? '∞' : item.stock}</span>
                  </div>

                  {/* Quantity + Buy */}
                  <div className="mt-auto space-y-2">
                    {/* Quantity selector */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQty(item.id, qty - 1)}
                        disabled={qty <= 1 || outOfStock}
                        className="w-8 h-8 rounded-lg bg-dark-hover border border-dark-border text-white hover:border-grove-border transition-colors disabled:opacity-40 flex items-center justify-center font-bold"
                      >−</button>
                      <div className="flex-1 text-center font-bold text-white bg-dark-hover rounded-lg py-1.5 border border-dark-border text-sm">
                        {qty}
                      </div>
                      <button
                        onClick={() => setQty(item.id, qty + 1)}
                        disabled={(!isInfinite && qty >= item.stock) || outOfStock}
                        className="w-8 h-8 rounded-lg bg-dark-hover border border-dark-border text-white hover:border-grove-border transition-colors disabled:opacity-40 flex items-center justify-center font-bold"
                      >+</button>
                    </div>

                    {/* Buy button */}
                    <button
                      onClick={() => buy(item)}
                      disabled={outOfStock || !canAfford || buying === item.id}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        outOfStock
                          ? 'bg-dark-muted text-zinc-600 cursor-not-allowed border border-dark-border'
                          : !canAfford
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed'
                          : 'bg-grove-green text-black hover:bg-grove-dark hover:shadow-[0_0_16px_#00ff6640] active:scale-95'
                      } disabled:opacity-60`}
                    >
                      {buying === item.id ? (
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : outOfStock ? (
                        'Indisponibil'
                      ) : !canAfford ? (
                        'Puncte insuficiente'
                      ) : (
                        <><ShoppingCart size={15} /> Cumpără</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
