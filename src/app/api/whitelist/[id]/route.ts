import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

// DELETE /api/whitelist/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }    = await params
  const { error } = await requireLeadership()
  if (error) return error

  await prisma.whitelist.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
