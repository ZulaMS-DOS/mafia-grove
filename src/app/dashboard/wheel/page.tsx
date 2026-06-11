'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { RotateCcw } from 'lucide-react'

interface Prize {
  id: string; label: string; type: string
  value: number; chance: number; color: string
}

const COLORS = [
  '#00ff66','#ffd600','#ef5350','#29b6f6',
  '#ab47bc','#ff7043','#26c6da','#d4e157',
]

export default function WheelPage() {
  const canvasRef                   = useRef<HTMLCanvasElement>(null)
  const [prizes, setPrizes]         = useState<Prize[]>([])
  const [spinCost, setSpinCost]     = useState(10)
  const [myPoints, setMyPoints]     = useState(0)
  const [spinning, setSpinning]     = useState(false)
  const [result, setResult]         = useState<{ label: string; detail: string; pointsAfter: number } | null>(null)
  const [loading, setLoading]       = useState(true)
  const [angle, setAngle]           = useState(0)
  const [targetAngle, setTarget]    = useState(0)
  const animRef                     = useRef<number>()

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

  // Deseneaza roata
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !prizes.length) return
    const ctx    = canvas.getContext('2d')!
    const cx     = canvas.width  / 2
    const cy     = canvas.height / 2
    const r      = Math.min(cx, cy) - 10
    const total  = prizes.reduce((a, p) => a + p.chance, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    let startAngle = angle * Math.PI / 180

    prizes.forEach((prize, i) => {
      const slice = (prize.chance / total) * 2 * Math.PI

      // Sector
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, startAngle, startAngle + slice)
      ctx.closePath()
      ctx.fillStyle   = prize.color || COLORS[i % COLORS.length]
      ctx.fill()
      ctx.strokeStyle = '#000'
      ctx.lineWidth   = 2
      ctx.stroke()

      // Text
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(startAngle + slice / 2)
      ctx.textAlign    = 'right'
      ctx.fillStyle    = '#000'
      ctx.font         = `bold ${Math.min(14, 120 / prizes.length)}px Inter`
      ctx.shadowColor  = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur   = 3
      const maxLen = 12
      const label  = prize.label.length > maxLen ? prize.label.slice(0, maxLen) + '…' : prize.label
      ctx.fillText(label, r - 12, 5)
      ctx.restore()

      startAngle += slice
    })

    // Centru
    ctx.beginPath()
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.strokeStyle = '#00ff66'
    ctx.lineWidth   = 3
    ctx.stroke()

  }, [prizes, angle])

  const spin = async () => {
    if (spinning || myPoints < spinCost) return
    setSpinning(true)
    setResult(null)

    const r = await fetch('/api/wheel', { method: 'POST' })
    const d = await r.json()

    if (!r.ok) {
      setResult({ label: '❌ Eroare', detail: d.error, pointsAfter: myPoints })
      setSpinning(false)
      return
    }

    // Calculeaza unghiul final bazat pe premiu
    const total = prizes.reduce((a, p) => a + p.chance, 0)
    let prizeAngle = 0
    let acc = 0
    for (const p of prizes) {
      if (p.id === d.prize.id) {
        prizeAngle = ((acc + p.chance / 2) / total) * 360
        break
      }
      acc += p.chance
    }

    // Roata se invarte 5-8 ture + ajunge la premiu
    const spins   = 5 + Math.floor(Math.random() * 3)
    const newTarget = targetAngle + spins * 360 + (360 - prizeAngle - angle % 360)

    setTarget(newTarget)

    // Animatie
    const duration  = 4000
    const startTime = Date.now()
    const startAng  = angle

    const animate = () => {
      const elapsed  = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased    = 1 - Math.pow(1 - progress, 3)
      const current  = startAng + (newTarget - startAng) * eased
      setAngle(current)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setAngle(newTarget)
        setMyPoints(d.pointsAfter)
        setResult({
          label:      d.prize.label,
          detail:     d.prizeResult,
          pointsAfter: d.pointsAfter,
        })
        setSpinning(false)
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current) }, [])

  const canSpin = myPoints >= spinCost && !spinning

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            🎰 Fortune Wheel
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Învârte roata și câștigă premii!</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-grove-border rounded-xl">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Punctele tale</span>
          <span className="text-grove-green font-black text-lg">{myPoints}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-600">Se încarcă...</div>
      ) : prizes.length === 0 ? (
        <div className="grove-card text-center py-12">
          <div className="text-5xl mb-3">🎰</div>
          <p className="text-zinc-600">Niciun premiu configurat momentan.</p>
          <p className="text-zinc-700 text-sm mt-1">Liderul va adăuga premii în curând.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start">
          {/* Roata */}
          <div className="flex flex-col items-center gap-4">
            {/* Indicator */}
            <div className="relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-grove-green drop-shadow-lg" />
              </div>
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="rounded-full shadow-[0_0_40px_#00ff6620]"
              />
            </div>

            {/* Buton spin */}
            <button
              onClick={spin}
              disabled={!canSpin}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg transition-all ${
                canSpin
                  ? 'bg-grove-green text-black hover:bg-grove-dark hover:shadow-[0_0_24px_#00ff6650] active:scale-95'
                  : 'bg-dark-muted text-zinc-600 cursor-not-allowed border border-dark-border'
              }`}
            >
              <RotateCcw size={22} className={spinning ? 'animate-spin' : ''} />
              {spinning ? 'Se învârte...' : `Învârte — ${spinCost} pts`}
            </button>

            {!canSpin && !spinning && (
              <p className="text-red-400 text-sm">
                Ai nevoie de {spinCost} pts (ai {myPoints})
              </p>
            )}
          </div>

          {/* Rezultat + Lista premii */}
          <div className="flex-1 w-full space-y-4">
            {/* Rezultat */}
            {result && (
              <div className="grove-card border-grove-border bg-grove-dim/30 animate-slide-up">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎉</div>
                  <div className="text-white font-black text-xl mb-1">{result.label}</div>
                  <div className="text-grove-green font-bold">{result.detail}</div>
                  <div className="text-zinc-500 text-sm mt-2">Puncte rămase: {result.pointsAfter}</div>
                </div>
              </div>
            )}

            {/* Lista premii */}
            <div className="grove-card">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">🏆 Premii Disponibile</h2>
              <div className="space-y-2">
                {prizes.map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-dark-hover transition-colors">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-white text-sm flex-1">{p.label}</span>
                    <span className="text-xs text-zinc-500">{p.chance}% șansă</span>
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
