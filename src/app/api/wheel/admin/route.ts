import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

// GET — toate premiile + spins history + lista shop pentru selector
export async function GET() {
  const { error } = await requireLeadership()
  if (error) return error

  const [prizes, config, spins, shopItems] = await Promise.all([
    (prisma as any).wheelPrize.findMany({ orderBy: { createdAt: 'asc' } }),
    (prisma as any).wheelConfig.findFirst(),
    (prisma as any).wheelSpin.findMany({
      orderBy: { createdAt: 'desc' },
      take:    50,
      include: { user: { select: { username: true } } },
    }),
    (prisma as any).shopItem.findMany({
      where:   { active: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return NextResponse.json({ prizes, spinCost: config?.spinCost ?? 10, spins, shopItems })
}

// POST — adauga premiu nou
export async function POST(req: NextRequest) {
  const { error } = await requireLeadership()
  if (error) return error

  const { label, type, value, itemId, chance, color } = await req.json()
  if (!label || chance === undefined) {
    return NextResponse.json({ error: 'Label si chance obligatorii' }, { status: 400 })
  }

  const prize = await (prisma as any).wheelPrize.create({
    data: {
      label,
      type:   type   || 'points',
      value:  parseInt(value)  || 0,
      itemId: itemId || null,
      chance: parseInt(chance) || 10,
      color:  color  || '#00ff66',
    },
  })
  return NextResponse.json({ prize })
}

// PATCH — update cost spin
export async function PATCH(req: NextRequest) {
  const { error } = await requireLeadership()
  if (error) return error

  const { spinCost } = await req.json()
  const existing = await (prisma as any).wheelConfig.findFirst()

  if (existing) {
    await (prisma as any).wheelConfig.update({
      where: { id: existing.id },
      data:  { spinCost: parseInt(spinCost) || 10 },
    })
  } else {
    await (prisma as any).wheelConfig.create({
      data: { spinCost: parseInt(spinCost) || 10 },
    })
  }
  return NextResponse.json({ success: true })
}

// DELETE — sterge premiu
export async function DELETE(req: NextRequest) {
  const { error } = await requireLeadership()
  if (error) return error

  const { id } = await req.json()
  await (prisma as any).wheelPrize.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
