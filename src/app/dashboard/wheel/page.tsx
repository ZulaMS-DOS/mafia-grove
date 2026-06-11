'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { RotateCcw, Sparkles } from 'lucide-react'

interface Prize {
  id: string; label: string; type: string
  value: number; chance: number; color: string
  itemId: string | null
  item?: { name: string; imageUrl: string | null }
}

export default function WheelPage() {
  const canvasRef               = useRef<HTMLCanvasElement>(null)
  const [prizes, setPrizes]     = useState<Prize[]>([])
  const [spinCost, setSpinCost] = useState(10)
  const [myPoints, setMyPoints] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult]     = useState<{
    prize: Prize; detail: string; pointsAfter: number; imageUrl?: string | null
  } | null>(null)
  const [loading, setLoading]   = useState(true)
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

  // ── Desenează roata ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !prizes.length) return
    const ctx = canvas.getContext('2d')!
    const W   = canvas.width
    const H   = canvas.height
    const cx  = W / 2
    const cy  = H / 2
    const R   = Math.min(cx, cy) - 8

    ctx.clearRect(0, 0, W, H)

    // Glow exterior
    const glow = ctx.createRadialGradient(cx, cy, R - 20, cx, cy, R + 8)
    glow.addColorStop(0, 'rgba(0,255,102,0)')
    glow.addColorStop(1, 'rgba(0,255,102,0.15)')
    ctx.beginPath()
    ctx.arc(cx, cy, R + 8, 0, Math.PI * 2)
    ctx.fillStyle = glow
    ctx.fill()

    // Sectoare egale ca dimensiune vizuala
    const n          = prizes.length
    const slice = (2 * Math.PI) / n
    const startOff   = (rotation * Math.PI) / 180

    prizes.forEach((prize, i) => {
      const start = startOff + i * sliceAngle
      const end   = start + sliceAngle

      // Sector
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, R, start, end)
      ctx.closePath()

      // Gradient pe sector
      const midAngle = start + sliceAngle / 2
      const gx = cx + (R * 0.5) * Math.cos(midAngle)
      const gy = cy + (R * 0.5) * Math.sin(midAngle)
      const sg = ctx.createRadialGradient(gx, gy, 0, cx, cy, R)
      sg.addColorStop(0, prize.color + 'ff')
      sg.addColorStop(1, prize.color + '99')
      ctx.fillStyle   = sg
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'
      ctx.lineWidth   = 1.5
      ctx.stroke()

      // Text
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + sliceAngle / 2)
      ctx.textAlign    = 'right'
      ctx.fillStyle    = '#000'
      ctx.font         = `bold ${Math.max(10, Math.min(13, 200 / n))}px Inter,sans-serif`
      ctx.shadowColor  = 'rgba(255,255,255,0.4)'
      ctx.shadowBlur   = 2
      const maxLen = Math.max(6, Math.floor(20 / (n / 4)))
      const lbl    = prize.label.length > maxLen ? prize.label.slice(0, maxLen) + '…' : prize.label
      ctx.fillText(lbl, R - 14, 4)
      ctx.restore()
    })

    // Inel exterior
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.strokeStyle = '#00ff6660'
    ctx.lineWidth   = 3
    ctx.stroke()

    // Centru
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28)
    cg.addColorStop(0, '#1a1a1a')
    cg.addColorStop(1, '#000')
    ctx.beginPath()
    ctx.arc(cx, cy, 28, 0, Math.PI * 2)
    ctx.fillStyle   = cg
    ctx.fill()
    ctx.strokeStyle = '#00ff66'
    ctx.lineWidth   = 3
    ctx.stroke()

    // Logo in centru
    ctx.fillStyle = '#00ff66'
    ctx.font      = 'bold 11px Inter,sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('GROVE', cx, cy + 4)

  }, [prizes, rotation])

  // ── Spin ─────────────────────────────────────────────────
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

    // Unghi final — sectorul castigator ajunge sus (la indicator)
    const n          = prizes.length
    const sliceAngle = 360 / n
    const prizeIdx   = prizes.findIndex(p => p.id === d.prize.id)
    const idx        = prizeIdx >= 0 ? prizeIdx : 0

    // Sectorul idx trebuie sa fie la 0° (sus) → rotim astfel incat mijlocul lui sa fie la 270° (sus pe canvas)
    const targetSectorMid = idx * sliceAngle + sliceAngle / 2
    const needed          = (270 - targetSectorMid + 720) % 360
    const totalRotation   = rotRef.current + 360 * (5 + Math.floor(Math.random() * 3)) + needed

    const startRot  = rotRef.current
    const startTime = Date.now()
    const duration  = 4500

    const animate = () => {
      const elapsed  = Date.now() - startTime
      const t        = Math.min(elapsed / duration, 1)
      // Ease out quart
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
          prize:      sd.prize,
          detail:     sd.prizeResult,
          pointsAfter: sd.pointsAfter,
          imageUrl:   sd.prize.type === 'item' ? sd.itemImageUrl : null,
        })
        setSpinning(false)
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current) }, [])

  const canSpin = !spinning && myPoints >= spinCost && prizes.length > 0

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            🎰 Fortune Wheel
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Învârte roata și câștigă premii!</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-grove-border rounded-xl">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Punctele tale</span>
          <span className="text-grove-green font-black text-xl">{myPoints}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-600">Se încarcă...</div>
      ) : prizes.length === 0 ? (
        <div className="grove-card text-center py-16">
          <div className="text-6xl mb-4">🎰</div>
          <p className="text-zinc-500 font-semibold">Niciun premiu configurat momentan.</p>
          <p className="text-zinc-700 text-sm mt-1">Liderul va adăuga premii în curând.</p>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-8 items-center xl:items-start">

          {/* ── Roata ── */}
          <div className="flex flex-col items-center gap-5 shrink-0">
            <div className="relative">
              {/* Indicator */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20 drop-shadow-[0_0_8px_#00ff66]">
                <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[28px] border-l-transparent border-r-transparent border-t-grove-green" />
              </div>

              {/* Shadow glow */}
              <div className="absolute inset-0 rounded-full blur-xl opacity-20" style={{ background: 'radial-gradient(circle, #00ff66 0%, transparent 70%)' }} />

              <canvas
                ref={canvasRef}
                width={420}
                height={420}
                className="relative z-10 rounded-full"
                style={{ filter: spinning ? 'drop-shadow(0 0 20px #00ff6640)' : 'drop-shadow(0 0 8px #00ff6620)' }}
              />
            </div>

            {/* Buton */}
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

          {/* ── Dreapta: Rezultat + Lista ── */}
          <div className="flex-1 w-full max-w-md space-y-4">

            {/* Rezultat */}
            {result && (
              <div className="grove-card border-grove-border animate-slide-up overflow-hidden">
                <div className="text-center space-y-3 py-2">
                  <div className="text-3xl">🎉</div>
                  <div className="text-white font-black text-2xl">{result.prize.label}</div>

                  {/* Poza item daca e din shop */}
                  {result.imageUrl && (
                    <div className="flex justify-center">
                      <img src={result.imageUrl} alt={result.prize.label}
                        className="h-32 object-contain rounded-xl"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  )}

                  <div className="text-grove-green font-bold text-lg">{result.detail}</div>
                  <div className="text-zinc-500 text-sm">Puncte rămase: <strong className="text-white">{result.pointsAfter}</strong></div>
                </div>
              </div>
            )}

            {/* Lista premii */}
            <div className="grove-card">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                🏆 Premii pe Roată
              </h2>
              <div className="space-y-1.5">
                {prizes.map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-dark-hover transition-colors">
                    <div className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/20" style={{ background: p.color }} />
                    <span className="text-white text-sm flex-1 font-medium">{p.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-dark-hover text-zinc-400 border border-dark-border">
                      {p.chance}%
                    </span>
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
