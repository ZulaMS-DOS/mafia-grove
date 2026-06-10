import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireLeadership } from '@/lib/middleware'

// POST /api/shop/[id]/buy — cumpara produs
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { id }     = await context.params
  const { quantity } = await req.json().catch(() => ({ quantity: 1 }))
  const qty        = parseInt(quantity) || 1
  const userId     = session!.user.id

  const item = await (prisma as any).shopItem.findUnique({ where: { id } })
  if (!item || !item.active) {
    return NextResponse.json({ error: 'Produs inexistent' }, { status: 404 })
  }

  // Verifica stoc
  if (item.stock !== -1 && item.stock < qty) {
    return NextResponse.json({ error: 'Stoc insuficient' }, { status: 400 })
  }

  // Verifica puncte
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const total = item.price * qty
  if (!user || user.points < total) {
    return NextResponse.json({ error: 'Puncte insuficiente' }, { status: 400 })
  }

  // Tranzactie: scade puncte + scade stoc + creeaza comanda
  const [updatedUser, order] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data:  { points: { decrement: total } },
      select: { points: true },
    }),
    (prisma as any).shopOrder.create({
      data: { userId, itemId: id, quantity: qty },
    }),
    ...(item.stock !== -1 ? [
      (prisma as any).shopItem.update({
        where: { id },
        data:  { stock: { decrement: qty } },
      })
    ] : []),
  ])

  return NextResponse.json({
    success: true,
    pointsLeft: updatedUser.points,
    order,
  })
}

// PATCH — editeaza produs (Lider only)
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
      ...(data.name        !== undefined && { name:        data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.imageUrl    !== undefined && { imageUrl:    data.imageUrl }),
      ...(data.price       !== undefined && { price:       parseInt(data.price) }),
      ...(data.stock       !== undefined && { stock:       parseInt(data.stock) }),
      ...(data.active      !== undefined && { active:      data.active }),
    },
  })
  return NextResponse.json({ item })
}

// DELETE — sterge produs (Lider only)
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
