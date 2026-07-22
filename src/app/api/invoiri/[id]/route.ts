import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'
import { notify } from '@/lib/notifications'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireLeadership()
  if (error) return error

  const { status } = await req.json()
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Status invalid' }, { status: 400 })
  }

  const { id } = await context.params

  const invoire = await prisma.leaveRequest.update({
    where:   { id },
    data:    { status, approvedBy: session!.user.id, approvedAt: new Date() },
    include: {
      user:     { select: { id: true, username: true } },
      approver: { select: { username: true } },
    },
  })

  // Notifica userul doar daca inca exista in DB
  if (invoire.user?.id) {
    await notify({
      userId:  invoire.user.id,
      type:    'leave',
      title:   status === 'ACCEPTED' ? '✅ Invoire Aprobată' : '❌ Invoire Respinsă',
      message: status === 'ACCEPTED'
        ? `Invoirea ta a fost aprobată de ${invoire.approver?.username}.`
        : `Invoirea ta a fost respinsă de ${invoire.approver?.username}.`,
    })
  }

  return NextResponse.json({ invoire })
}
