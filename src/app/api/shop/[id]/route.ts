import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireLeadership } from '@/lib/middleware'
import { checkRateLimit } from '@/lib/rateLimit'
import { notify } from '@/lib/notifications'

const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = session!.user.id

  const rl = checkRateLimit(`shop-buy:${userId}`, { windowMs: 60_000, max: 10 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Prea multe cumpărări! Mai încearcă în ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    )
  }

  const { id } = await context.params
  const body   = await req.json().catch(() => ({}))
  const qty    = Math.max(1, parseInt(body.quantity) || 1)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await (tx as any).shopItem.findUnique({ where: { id } })
      if (!item || !item.active) throw new Error('NOT_FOUND')
      if (item.stock !== -1 && item.stock < qty) throw new Error(`STOCK:${item.stock}`)

      const user  = await tx.user.findUnique({ where: { id: userId } })
      const total = item.price * qty
      if (!user || user.points < total) throw new Error(`POINTS:${user?.points ?? 0}:${total}`)

      const updatedUser = await tx.user.update({
        where:  { id: userId },
        data:   { points: { decrement: total } },
        select: { points: true },
      })

      const order = await (tx as any).shopOrder.create({
        data: { userId, itemId: id, quantity: qty },
      })

      if (item.stock !== -1) {
        await (tx as any).shopItem.update({
          where: { id },
          data:  { stock: { decrement: qty } },
        })
      }

      return { pointsLeft: updatedUser.points, order, itemName: item.name, total }
    })

    // Notifica Lider/Co-Lider
    const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
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
          title:   '🛒 Cumpărătură Nouă',
          message: `${buyer?.username} a cumpărat "${result.itemName}" pentru ${result.total} pts`,
        }))
    )

    return NextResponse.json({ success: true, pointsLeft: result.pointsLeft, order: result.order })

  } catch (e: any) {
    const msg = typeof e.message === 'string' ? e.message : ''
    if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Produs inexistent' }, { status: 404 })
    if (msg.startsWith('STOCK:')) {
      const stock = msg.split(':')[1]
      return NextResponse.json({ error: `Stoc insuficient (disponibil: ${stock})` }, { status: 400 })
    }
    if (msg.startsWith('POINTS:')) {
      const [, have, need] = msg.split(':')
      return NextResponse.json({ error: `Puncte insuficiente (ai ${have}, ai nevoie de ${need})` }, { status: 400 })
    }
    throw e
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireLeadership()
  if (error) return error

  const { id } = await context.params
  const data   = await req.json()

  const item = await (prisma as any).shopItem.update({
    where: { id },
    data: {
      ...(data.name        !== undefined && { name:        String(data.name) }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.imageUrl    !== undefined && { imageUrl:    data.imageUrl    || null }),
      ...(data.price       !== undefined && { price:       parseInt(data.price) }),
      ...(data.stock       !== undefined && { stock:       parseInt(data.stock) }),
      ...(data.active      !== undefined && { active:      Boolean(data.active) }),
    },
  })
  return NextResponse.json({ item })
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireLeadership()
  if (error) return error

  const { id } = await context.params
  await (prisma as any).shopItem.update({ where: { id }, data: { active: false } })
  return NextResponse.json({ success: true })
}
