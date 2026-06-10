import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireLeadership } from '@/lib/middleware'

// GET — toate produsele active
export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const items = await (prisma as any).shopItem.findMany({
    where:   { active: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ items })
}

// POST — adauga produs nou (Lider only)
export async function POST(req: NextRequest) {
  const { session, error } = await requireLeadership()
  if (error) return error

  const { name, description, imageUrl, price, stock } = await req.json()
  if (!name || price === undefined) {
    return NextResponse.json({ error: 'Nume si pret obligatorii' }, { status: 400 })
  }

  const item = await (prisma as any).shopItem.create({
    data: {
      name,
      description: description || null,
      imageUrl:    imageUrl    || null,
      price:       parseInt(price),
      stock:       stock !== undefined ? parseInt(stock) : -1,
      createdBy:   session!.user.id,
    },
  })
  return NextResponse.json({ item })
}
