'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { RotateCcw, Sparkles, Coins } from 'lucide-react'

interface Prize {
  id: string; label: string; type: string
  value: number; chance: number; color: string
  itemId: string | null; itemImageUrl: string | null; itemName: string | null
}

export default function WheelPage() {
  const canvasRef               = useRef<HTMLCanvasElement>(null)
  const imgCache                = useRef<Map<string, HTMLImageElement>>(new Map())
  const [prizes, setPrizes]     = useState<Prize[]>([])
  const [spinCost, setSpinCost] = useState(10)
  const [myPoints, setMyPoints] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult]     = useState<{
    prize: Prize; detail: string; pointsAfter: number; imageUrl?: string | null
  } | null>(null)
  const [loading, setLoading]   = useState(true)
  const [imagesReady, setImagesReady] = useState(false)
  const [rotation, setRotation] = useState(0)
  const rotRef                  = useRef(0)
  const animRef                 = useRef<number>()
  const spinDataRef             = useRef<any>(null)

  const load = useCallback(async () => {
    const [wRes, pRes] = await Promise.all([
      fetch('/api/wheel'),
      fetch('/api/points'),
    ])
    const wData = await wRes.json()
    const pData = await pRes.json()
    setPrizes(wData.prizes || [])
    setSpinCost(wData.spinCost || 10)
    setMyPoints(pData.points || 0)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!prizes.length) { setImagesReady(true); return }
    const urls = prizes.filter(p => p.itemImageUrl).map(p => p.itemImageUrl!)
    if (!urls.length) { setImagesReady(true); return }

    let loaded = 0
    urls.forEach(url => {
      if (imgCache.current.has(url)) { loaded++; if (loaded === urls.length) setImagesReady(true); return }
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload  = () => { imgCache.current.set(url, img); loaded++; if (loaded === urls.length) setImagesReady(true) }
      img.onerror = () => { loaded++; if (loaded === urls.length) setImagesReady(true) }
      img.src = url
    })
  }, [prizes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !prizes.length || !imagesReady) return
    const ctx = canvas.getContext('2d')!
    const W   = canvas.width
    const H   = canvas.height
    const cx  = W / 2
    const cy  = H / 2
    const R   = Math.min(cx, cy) - 8

    ctx.clearRect(0, 0, W, H)

    const glow = ctx.createRadialGradient(cx, cy, R - 10, cx, cy, R + 14)
    glow.addColorStop(0, 'rgba(0,255,102,0)')
    glow.addColorStop(1, 'rgba(0,255,102,0.25)')
    ctx.beginPath()
    ctx.arc(cx, cy, R + 14, 0, Math.PI * 2)
    ctx.fillStyle = glow
    ctx.fill()

    const n          = prizes.length
    const sliceAngle = (2 * Math.PI) / n
    const startOff   = (rotation * Math.PI) / 180

    prizes.forEach((prize, i) => {
      const start = startOff + i * sliceAngle
      const end   = start + sliceAngle
      const mid   = start + sliceAngle / 2

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, R, start, end)
      ctx.closePath()
      ctx.fillStyle = i % 2 === 0 ? '#0a0a0a' : '#050505'
      ctx.fill()

      ctx.strokeStyle = 'rgba(0,255,102,0.35)'
      ctx.lineWidth   = 1.5
      ctx.stroke()

      const img = prize.itemImageUrl ? imgCache.current.get(prize.itemImageUrl) : null
      const imgRadius = R * 0.62
      const imgSize   = Math.max(34, Math.min(58, 280 / n))
      const ix = cx + imgRadius * Math.cos(mid)
      const iy = cy + imgRadius * Math.sin(mid)

      if (img) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(ix, iy, imgSize / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(img, ix - imgSize / 2, iy - imgSize / 2, imgSize, imgSize)
        ctx.restore()

        ctx.beginPath()
        ctx.arc(ix, iy, imgSize / 2, 0, Math.PI * 2)
        ctx.strokeStyle = '#00ff66'
        ctx.lineWidth   = 2.5
        ctx.shadowColor = '#00ff66'
        ctx.shadowBlur  = 8
        ctx.stroke()
        ctx.shadowBlur  = 0
      } else {
        ctx.save()
        ctx.beginPath()
        ctx.arc(ix, iy, imgSize / 2, 0, Math.PI * 2)
        ctx.fillStyle = '#111'
        ctx.fill()
        ctx.strokeStyle = prize.color || '#00ff66'
        ctx.lineWidth   = 2.5
        ctx.shadowColor = prize.color || '#00ff66'
        ctx.shadowBlur  = 8
        ctx.stroke()
        ctx.shadowBlur  = 0
        ctx.fillStyle   = prize.color || '#00ff66'
        ctx.font        = `bold ${Math.max(14, imgSize * 0.4)}px sans-serif`
        ctx.textAlign   = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('$', ix, iy)
        ctx.restore()
      }

      const textRadius = R * 0.88
      const tx = cx + textRadius * Math.cos(mid)
      const ty = cy + textRadius * Math.sin(mid)

      ctx.save()
      ctx.translate(tx, ty)
      ctx.rotate(mid + Math.PI / 2)
      ctx.fillStyle    = '#00ff66'
      ctx.font          = `bold ${Math.max(9, Math.min(11, 130 / n))}px Inter,sans-serif`
      ctx.textAlign     = 'center'
      ctx.shadowColor   = '#000'
      ctx.shadowBlur    = 3
      const maxLen = Math.max(6, Math.floor(16 / (n / 5)))
      const lbl    = prize.label.length > maxLen ? prize.label.slice(0, maxLen) + '…' : prize.label
      ctx.fillText(lbl, 0, 0)
      ctx.restore()
    })

    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.strokeStyle = '#00ff66'
    ctx.lineWidth   = 3
    ctx.shadowColor = '#00ff66'
    ctx.shadowBlur  = 10
    ctx.stroke()
    ctx.shadowBlur  = 0

    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30)
    cg.addColorStop(0, '#000')
    cg.addColorStop(1, '#0a0a0a')
    ctx.beginPath()
    ctx.arc(cx, cy, 30, 0, Math.PI * 2)
    ctx.fillStyle   = cg
    ctx.fill()
    ctx.strokeStyle = '#00ff66'
    ctx.lineWidth   = 3
    ctx.shadowColor = '#00ff66'
    ctx.shadowBlur  = 12
    ctx.stroke()
    ctx.shadowBlur  = 0

    ctx.fillStyle = '#00ff66'
    ctx.font      = 'bold 11px Inter,sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('GROVE', cx, cy + 4)

  }, [prizes, rotation, imagesReady])

  const spin = async () => {
    if (spinning || myPoints < spinCost || !prizes.length) return
    setSpinning(true)
    setResult(null)

    const r = await fetch('/api/wheel', { method: 'POST' })
    const d = await r.json()

    if (!r.ok) {
      alert(d.error || 'Eroare')
      setSpinning(false)
      return
    }

    spinDataRef.current = d

    const n          = prizes.length
    const sliceAngle  = 360 / n
    const prizeIdx    = prizes.findIndex(p => p.id === d.prize.id)
    const idx         = prizeIdx >= 0 ? prizeIdx : 0

    const targetSectorMid = idx * sliceAngle + sliceAngle / 2
    const needed           = (270 - targetSectorMid + 720) % 360
    const totalRotation    = rotRef.current + 360 * (5 + Math.floor(Math.random() * 3)) + needed

    const startRot  = rotRef.current
    const startTime = Date.now()
    const duration  = 4500

    const animate = () => {
      const elapsed  = Date.now() - startTime
      const t        = Math.min(elapsed / duration, 1)
      const eased    = 1 - Math.pow(1 - t, 4)
      const current  = startRot + (totalRotation - startRot) * eased
      rotRef.current = current
      setRotation(current % 360)

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        rotRef.current = totalRotation % 360
        setRotation(totalRotation % 360)

        const sd = spinDataRef.current
        setMyPoints(sd.pointsAfter)
        setResult({
          prize:       sd.prize,
          detail:      sd.prizeResult,
          pointsAfter: sd.pointsAfter,
          imageUrl:    sd.prize.type === 'item' ? sd.itemImageUrl : null,
        })
        setSpinning(false)
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current) }, [])

  const canSpin = !spinning && myPoints >= spinCost && prizes.length > 0

  return (
    <div className="space-y-6 animate-slide-up relative">
      <div className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#00ff66 1px, transparent 1px), linear-gradient(90deg, #00ff66 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            🎰 Fortune Wheel
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Învârte roata și câștigă premii din Grove Street!</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-grove-border rounded-xl">
          <Coins size={16} className="text-grove-green" />
          <span className="text-grove-green font-black text-xl">{myPoints}</span>
        </div>
      </div>

      {loading || !imagesReady ? (
        <div className="text-center py-20 text-zinc-600">Se încarcă...</div>
      ) : prizes.length === 0 ? (
        <div className="grove-card text-center py-16">
          <div className="text-6xl mb-4">🎰</div>
          <p className="text-zinc-500 font-semibold">Niciun premiu configurat momentan.</p>
          <p className="text-zinc-700 text-sm mt-1">Liderul va adăuga premii în curând.</p>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-8 items-center xl:items-start">

          <div className="flex flex-col items-center gap-5 shrink-0">
            <div className="relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20 drop-shadow-[0_0_8px_#00ff66]">
                <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[28px] border-l-transparent border-r-transparent border-t-grove-green" />
              </div>

              <div className="absolute inset-0 rounded-full blur-xl opacity-30" style={{ background: 'radial-gradient(circle, #00ff66 0%, transparent 70%)' }} />

              <canvas
                ref={canvasRef}
                width={440}
                height={440}
                className="relative z-10 rounded-full bg-black"
                style={{ filter: spinning ? 'drop-shadow(0 0 24px #00ff6650)' : 'drop-shadow(0 0 10px #00ff6625)' }}
              />
            </div>

            <button onClick={spin} disabled={!canSpin}
              className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-lg transition-all duration-200 ${
                canSpin
                  ? 'bg-grove-green text-black hover:bg-grove-dark hover:shadow-[0_0_32px_#00ff6660] active:scale-95'
                  : 'bg-dark-muted text-zinc-600 cursor-not-allowed border border-dark-border'
              }`}>
              {spinning
                ? <><RotateCcw size={22} className="animate-spin" /> Se învârte...</>
                : <><Sparkles size={22} /> Învârte — {spinCost} pts</>
              }
            </button>

            {!canSpin && !spinning && prizes.length > 0 && (
              <p className="text-red-400 text-sm text-center">
                Ai nevoie de {spinCost} pts · ai {myPoints} pts
              </p>
            )}
          </div>

          <div className="flex-1 w-full max-w-md space-y-4">

            {result && (
              <div className="grove-card border-grove-border animate-slide-up overflow-hidden bg-black">
                <div className="text-center space-y-3 py-2">
                  <div className="text-3xl">🎉</div>
                  <div className="text-white font-black text-2xl">{result.prize.label}</div>

                  {result.imageUrl && (
                    <div className="flex justify-center">
                      <img src={result.imageUrl} alt={result.prize.label}
                        className="h-32 object-contain rounded-xl border-2 border-grove-border shadow-[0_0_20px_#00ff6640]"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  )}

                  <div className="text-grove-green font-bold text-lg">{result.detail}</div>
                  <div className="text-zinc-500 text-sm">Puncte rămase: <strong className="text-white">{result.pointsAfter}</strong></div>
                </div>
              </div>
            )}

            <div className="grove-card bg-black">
              <h2 className="text-xs font-semibold text-grove-green uppercase tracking-widest mb-3">
                🏆 Premii pe Roată
              </h2>
              <div className="space-y-1.5">
                {prizes.map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-dark-hover transition-colors">
                    {p.itemImageUrl ? (
                      <img src={p.itemImageUrl} alt={p.label}
                        className="w-8 h-8 rounded-full object-cover border-2 border-grove-border shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-black border-2 border-grove-border flex items-center justify-center shrink-0">
                        <Coins size={14} className="text-grove-green" />
                      </div>
                    )}
                    <span className="text-white text-sm flex-1 font-medium">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
