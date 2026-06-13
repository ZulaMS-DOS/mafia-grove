import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'
import { notify } from '@/lib/notifications'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireLeadership()
  if (error) return error

  const { status } = await req.json()
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Status invalid' }, { status: 400 })
  }

  const invoire = await prisma.leaveRequest.update({
    where: { id: params.id },
    data:  { status, approvedBy: session!.user.id, approvedAt: new Date() },
    include: { user: { select: { id: true, username: true } }, approver: { select: { username: true } } },
  })

  // Notifica userul
  await notify({
    userId:  invoire.user.id,
    type:    'leave',
    title:   status === 'ACCEPTED' ? '✅ Invoire Aprobată' : '❌ Invoire Respinsă',
    message: status === 'ACCEPTED'
      ? `Cererea ta de invoire a fost aprobată de ${invoire.approver?.username}.`
      : `Cererea ta de invoire a fost respinsă de ${invoire.approver?.username}.`,
  })

  return NextResponse.json({ invoire })
}
