import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireLeadership()
  if (error) return error

  await (prisma as any).announcement.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
