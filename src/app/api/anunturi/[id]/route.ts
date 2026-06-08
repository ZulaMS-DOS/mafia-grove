import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireLeadership()
  if (error) return error

  const { id } = await context.params
  await (prisma as any).announcement.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
