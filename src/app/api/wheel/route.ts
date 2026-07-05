import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { checkRateLimit } from '@/lib/rateLimit'
import { notify } from '@/lib/notifications'

const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']

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

  const itemIds = prizes.filter((p: any) => p.itemId).map((p: any) => p.itemId)
  const shopItems = itemIds.length
    ? await (prisma as any).shopItem.findMany({ where: { id: { in: itemIds } } })
    : []
  const itemMap = new Map(shopItems.map((i: any) => [i.id, i]))

  const enriched = prizes.map((p: any) => ({
    ...p,
    itemImageUrl: p.itemId ? (itemMap.get(p.itemId) as any)?.imageUrl ?? null : null,
    itemName:     p.itemId ? (itemMap.get(p.itemId) as any)?.name     ?? null : null,
  }))

  return NextResponse.json({ prizes: enriched, spinCost: config?.spinCost ?? 10 })
}

export async function POST() {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = session!.user.id

  const rl = checkRateLimit(`wheel-spin:${userId}`, { windowMs: 60_000, max: 6 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Învârți prea repede! Mai încearcă în ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    )
  }

  const [prizes, config] = await Promise.all([
    (prisma as any).wheelPrize.findMany({ where: { active: true } }),
    (prisma as any).wheelConfig.findFirst(),
  ])

  if (!prizes.length) {
    return NextResponse.json({ error: 'Niciun premiu configurat' }, { status: 400 })
  }

  const spinCost = config?.spinCost ?? 10

  const totalChance = prizes.reduce((a: number, p: any) => a + p.chance, 0)
  let rand  = Math.random() * totalChance
  let prize = prizes[prizes.length - 1]
  for (const p of prizes) {
    rand -= p.chance
    if (rand <= 0) { prize = p; break }
  }

  let userAfterDeduction
  try {
    userAfterDeduction = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user || user.points < spinCost) {
        throw new Error(`INSUFFICIENT:${user?.points ?? 0}`)
      }
      return tx.user.update({
        where: { id: userId },
        data:  { points: { decrement: spinCost } },
      })
    })
  } catch (e: any) {
    if (typeof e.message === 'string' && e.message.startsWith('INSUFFICIENT:')) {
      const current = e.message.split(':')[1]
      return NextResponse.json({
        error: `Puncte insuficiente! Ai ${current} pts, ai nevoie de ${spinCost} pts.`
      }, { status: 400 })
    }
    throw e
  }

  let pointsAfter  = userAfterDeduction.points
  let prizeResult  = ''
  let itemImageUrl = null

  if (prize.type === 'points') {
    const updated = await prisma.user.update({
      where: { id: userId },
      data:  { points: { increment: prize.value } },
    })
    pointsAfter = updated.points
    prizeResult = `+${prize.value} Grove Coins`

  } else if (prize.type === 'item' && prize.itemId) {
    const item = await (prisma as any).shopItem.findUnique({ where: { id: prize.itemId } })
    itemImageUrl = item?.imageUrl ?? null

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
      const bonus = prize.value || 5
      const updated = await prisma.user.update({
        where: { id: userId },
        data:  { points: { increment: bonus } },
      })
      pointsAfter = updated.points
      prizeResult = `+${bonus} Grove Coins (stoc epuizat)`
    }
  }

  await (prisma as any).wheelSpin.create({
    data: { userId, prizeId: prize.id, prizeLabel: prize.label, cost: spinCost },
  })

  // Notifica Lider/Co-Lider despre spin
  const spinner = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
  const leaders = await prisma.user.findMany({
    where:  { roleIds: { hasSome: LEADERSHIP_ROLES } },
    select: { id: true },
  })
  await Promise.all(
    leaders
      .filter(l => l.id !== userId)
      .map(l => notify({
        userId:  l.id,
        type:    'announcement',
        title:   '🎰 Spin Roată',
        message: `${spinner?.username} a câștigat "${prizeResult}" la Fortune Wheel!`,
      }))
  )

  return NextResponse.json({
    success: true,
    prize,
    prizeResult,
    pointsAfter,
    spinCost,
    itemImageUrl,
  })
}
