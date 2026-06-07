import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireLeadership()
  if (error) return error
  const { status } = await req.json()
  if (!['ACCEPTED', 'REJECTED'].includes(status)) return NextResponse.json({ error: 'Status invalid' }, { status: 400 })
  const demisie = await prisma.resignation.update({
    where: { id: params.id },
    data: { status, approvedBy: session!.user.id, approvedAt: new Date() },
    include: { user: { select: { username: true } }, approver: { select: { username: true } } },
  })
  return NextResponse.json({ demisie })
}
