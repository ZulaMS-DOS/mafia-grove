import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

export async function GET() {
  const { error } = await requireLeadership()
  if (error) return error

  const orders = await (prisma as any).shopOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take:    50,
    include: {
      user: { select: { username: true, avatar: true } },
      item: { select: { name: true, imageUrl: true, price: true } },
    },
  })

  return NextResponse.json({ orders })
}
