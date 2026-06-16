import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireLeadership } from '@/lib/middleware'

// POST — cumpara produs
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { id }   = await context.params
  const body     = await req.json().catch(() => ({}))
  const qty      = Math.max(1, parseInt(body.quantity) || 1)
  const userId   = session!.user.id

  const item = await (prisma as any).shopItem.findUnique({ where: { id } })
  if (!item || !item.active) {
    return NextResponse.json({ error: 'Produs inexistent' }, { status: 404 })
  }

  if (item.stock !== -1 && item.stock < qty) {
    return NextResponse.json({ error: `Stoc insuficient (disponibil: ${item.stock})` }, { status: 400 })
  }

  const user  = await prisma.user.findUnique({ where: { id: userId } })
  const total = item.price * qty
  if (!user || user.points < total) {
    return NextResponse.json({
      error: `Puncte insuficiente (ai ${user?.points ?? 0}, ai nevoie de ${total})`
    }, { status: 400 })
  }

  const updatedUser = await prisma.user.update({
    where:  { id: userId },
    data:   { points: { decrement: total } },
    select: { points: true },
  })

  const order = await (prisma as any).shopOrder.create({
    data: { userId, itemId: id, quantity: qty },
  })

  if (item.stock !== -1) {
    await (prisma as any).shopItem.update({
      where: { id },
      data:  { stock: { decrement: qty } },
    })
  }

  return NextResponse.json({
    success:    true,
    pointsLeft: updatedUser.points,
    order,
  })
}

// PATCH — editeaza produs
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
      ...(data.imageUrl     !== undefined && { imageUrl:    data.imageUrl     || null }),
      ...(data.price        !== undefined && { price:       parseInt(data.price) }),
      ...(data.stock        !== undefined && { stock:       parseInt(data.stock) }),
      ...(data.active       !== undefined && { active:      Boolean(data.active) }),
    },
  })
  return NextResponse.json({ item })
}

// DELETE — dezactiveaza produs
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
