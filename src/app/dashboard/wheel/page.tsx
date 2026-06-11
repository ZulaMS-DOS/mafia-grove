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
    const R   = Math.min(cx, cy) - 12

    ctx.clearRect(0, 0, W, H)

    const n          = prizes.length
    const sliceAngle = (2 * Math.PI) / n
    const startOff   = (rotation * Math.PI) / 180

    // ── Umbra exterioara (glow verde) ──
    ctx.save()
    ctx.shadowColor = '#00ff66'
    ctx.shadowBlur  = 28
    ctx.beginPath()
    ctx.arc(cx, cy, R + 2, 0, Math.PI * 2)
    ctx.strokeStyle = '#00ff6640'
    ctx.lineWidth   = 6
    ctx.stroke()
    ctx.restore()

    // ── Sectoare egale ──
    prizes.forEach((prize, i) => {
      const start = startOff + i * sliceAngle
      const end   = start + sliceAngle
      const mid   = start + sliceAngle / 2

      // ── Umplere sector ──
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, R, start, end)
      ctx.closePath()

      // Gradient radial pe fiecare sector
      const gx = cx + (R * 0.55) * Math.cos(mid)
      const gy = cy + (R * 0.55) * Math.sin(mid)
      const grad = ctx.createRadialGradient(gx, gy, 0, cx, cy, R)
      grad.addColorStop(0, prize.color + 'ff')
      grad.addColorStop(0.7, prize.color + 'dd')
      grad.addColorStop(1, prize.color + '88')
      ctx.fillStyle = grad
      ctx.fill()

      // ── Contur alb între sectoare ──
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, R, start, end)
      ctx.closePath()
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth   = 2.5
      ctx.stroke()

      // ── Text: doar șansa % ──
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(mid)

      // Fundal mic semi-transparent pentru lizibilitate
      const textR  = R * 0.72
      const txtW   = 38
      const txtH   = 20
      ctx.fillStyle = 'rgba(0,0,0,0.30)'
      ctx.beginPath()
      ctx.roundRect(textR - txtW - 2, -txtH / 2, txtW + 4, txtH, 4)
      ctx.fill()

      // Textul procentului
      ctx.textAlign    = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle    = '#ffffff'
      ctx.font         = `bold ${n <= 6 ? 15 : n <= 10 ? 13 : 11}px Inter,sans-serif`
      ctx.shadowColor  = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur   = 4
      ctx.fillText(`${prize.chance}%`, textR, 0)

      ctx.restore()
    })

    // ── Inel exterior (contur verde) ──
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.strokeStyle = '#00ff66'
    ctx.lineWidth   = 4
    ctx.shadowColor = '#00ff66'
    ctx.shadowBlur  = 12
    ctx.stroke()
    ctx.shadowBlur  = 0

    // ── Inel interior decorativ ──
    ctx.beginPath()
    ctx.arc(cx, cy, R * 0.12, 0, Math.PI * 2)
    ctx.fillStyle = '#0a0a0a'
    ctx.fill()
    ctx.strokeStyle = '#00ff66'
    ctx.lineWidth   = 2.5
    ctx.stroke()

    // ── Centru ──
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30)
    cg.addColorStop(0, '#1f1f1f')
    cg.addColorStop(1, '#000000')
    ctx.beginPath()
    ctx.arc(cx, cy, 30, 0, Math.PI * 2)
    ctx.fillStyle   = cg
    ctx.fill()
    ctx.strokeStyle = '#00ff66'
    ctx.lineWidth   = 2.5
    ctx.shadowColor = '#00ff66'
    ctx.shadowBlur  = 10
    ctx.stroke()
    ctx.shadowBlur  = 0

    ctx.fillStyle    = '#00ff66'
    ctx.font         = 'bold 10px Inter,sans-serif'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('GROVE', cx, cy)

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

    const n            = prizes.length
    const sliceAngle   = 360 / n
    const prizeIdx     = prizes.findIndex(p => p.id === d.prize.id)
    const idx          = prizeIdx >= 0 ? prizeIdx : 0

    const targetSectorMid = idx * sliceAngle + sliceAngle / 2
    const needed          = (270 - targetSectorMid + 720) % 360
    const totalRotation   = rotRef.current + 360 * (5 + Math.floor(Math.random() * 3)) + needed

    const startRot  = rotRef.current
    const startTime = Date.now()
    const duration  = 5000

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
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                <div
                  className="w-0 h-0"
                  style={{
                    borderLeft:   '13px solid transparent',
                    borderRight:  '13px solid transparent',
                    borderTop:    '26px solid #00ff66',
                    filter:       'drop-shadow(0 0 8px #00ff66)',
                  }}
                />
              </div>

              {/* Glow fundal */}
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-25 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #00ff66 0%, transparent 70%)' }}
              />

              <canvas
                ref={canvasRef}
                width={420}
                height={420}
                className="relative z-10 rounded-full"
                style={{
                  filter: spinning
                    ? 'drop-shadow(0 0 24px #00ff6660)'
                    : 'drop-shadow(0 0 10px #00ff6630)',
                }}
              />
            </div>

            {/* Buton Spin */}
            <button
              onClick={spin}
              disabled={!canSpin}
              className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-lg transition-all duration-200 ${
                canSpin
                  ? 'bg-grove-green text-black hover:brightness-110 hover:shadow-[0_0_32px_#00ff6660] active:scale-95'
                  : 'bg-dark-muted text-zinc-600 cursor-not-allowed border border-dark-border'
              }`}
            >
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

          {/* ── Dreapta: Rezultat + Legendă ── */}
          <div className="flex-1 w-full max-w-md space-y-4">

            {/* Rezultat */}
            {result && (
              <div className="grove-card border-grove-border animate-slide-up overflow-hidden">
                <div className="text-center space-y-3 py-2">
                  <div className="text-3xl">🎉</div>
                  <div className="text-white font-black text-2xl">{result.prize.label}</div>
                  {result.imageUrl && (
                    <div className="flex justify-center">
                      <img
                        src={result.imageUrl}
                        alt={result.prize.label}
                        className="h-32 object-contain rounded-xl"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}
                  <div className="text-grove-green font-bold text-lg">{result.detail}</div>
                  <div className="text-zinc-500 text-sm">
                    Puncte rămase: <strong className="text-white">{result.pointsAfter}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Legendă premii */}
            <div className="grove-card">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                🏆 Premii disponibile
              </h2>
              <div className="space-y-1.5">
                {prizes.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-dark-hover transition-colors border border-transparent hover:border-dark-border"
                  >
                    {/* Pătrat culoare cu contur */}
                    <div
                      className="w-4 h-4 rounded shrink-0"
                      style={{
                        background:  p.color,
                        boxShadow:   `0 0 6px ${p.color}80`,
                        border:      '1.5px solid rgba(255,255,255,0.3)',
                      }}
                    />
                    <span className="text-white text-sm flex-1 font-medium">{p.label}</span>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-bold"
                      style={{
                        background: p.color + '22',
                        color:      p.color,
                        border:     `1px solid ${p.color}55`,
                      }}
                    >
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
