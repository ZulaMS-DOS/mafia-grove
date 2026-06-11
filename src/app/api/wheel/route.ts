import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireLeadership } from '@/lib/middleware'

// GET — premiile active + config
export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const [prizes, config] = await Promise.all([
    (prisma as any).wheelPrize.findMany({
      where:   { active: true },
      orderBy: { createdAt: 'asc' },
    }),
    (prisma as any).wheelConfig.findFirst(),
  ])

  return NextResponse.json({
    prizes,
    spinCost: config?.spinCost ?? 10,
  })
}

// POST — invarte roata
export async function POST() {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = session!.user.id

  // Obtine premiile si costul
  const [prizes, config] = await Promise.all([
    (prisma as any).wheelPrize.findMany({ where: { active: true } }),
    (prisma as any).wheelConfig.findFirst(),
  ])

  if (!prizes.length) {
    return NextResponse.json({ error: 'Niciun premiu configurat' }, { status: 400 })
  }

  const spinCost = config?.spinCost ?? 10

  // Verifica puncte
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.points < spinCost) {
    return NextResponse.json({
      error: `Puncte insuficiente! Ai ${user?.points ?? 0} pts, ai nevoie de ${spinCost} pts.`
    }, { status: 400 })
  }

  // Alege premiul random bazat pe sanse
  const totalChance = prizes.reduce((a: number, p: any) => a + p.chance, 0)
  let rand = Math.random() * totalChance
  let prize = prizes[prizes.length - 1]
  for (const p of prizes) {
    rand -= p.chance
    if (rand <= 0) { prize = p; break }
  }

  // Scade punctele pentru spin
  await prisma.user.update({
    where: { id: userId },
    data:  { points: { decrement: spinCost } },
  })

  // Acorda premiul
  let pointsAfter = user.points - spinCost
  let prizeResult = ''

  if (prize.type === 'points') {
    await prisma.user.update({
      where: { id: userId },
      data:  { points: { increment: prize.value } },
    })
    pointsAfter += prize.value
    prizeResult = `+${prize.value} Grove Coins`
  } else if (prize.type === 'item' && prize.itemId) {
    // Acorda itemul din shop
    const item = await (prisma as any).shopItem.findUnique({ where: { id: prize.itemId } })
    if (item && (item.stock === -1 || item.stock > 0)) {
      await (prisma as any).shopOrder.create({
        data: { userId, itemId: prize.itemId, quantity: 1 },
      })
      if (item.stock !== -1) {
        await (prisma as any).shopItem.update({
          where: { id: prize.itemId },
          data:  { stock: { decrement: 1 } },
        })
      }
      prizeResult = item.name
    } else {
      // Item epuizat — da puncte in schimb
      await prisma.user.update({
        where: { id: userId },
        data:  { points: { increment: prize.value || 5 } },
      })
      pointsAfter += prize.value || 5
      prizeResult = `+${prize.value || 5} Grove Coins (stoc epuizat)`
    }
  }

  // Salveaza spinul
  await (prisma as any).wheelSpin.create({
    data: {
      userId,
      prizeId:    prize.id,
      prizeLabel: prize.label,
      cost:       spinCost,
    },
  })

  return NextResponse.json({
    success:     true,
    prize,
    prizeResult,
    pointsAfter,
    spinCost,
  })
}
