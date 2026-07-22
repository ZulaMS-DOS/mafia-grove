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

  const demisie = await prisma.resignation.update({
    where:   { id },
    data:    { status, approvedBy: session!.user.id, approvedAt: new Date() },
    include: {
      user:     { select: { id: true, username: true } },
      approver: { select: { username: true } },
    },
  })

  // Notifica userul doar daca inca exista in DB
  if (demisie.user?.id) {
    await notify({
      userId:  demisie.user.id,
      type:    'resignation',
      title:   status === 'ACCEPTED' ? '✅ Demisie Acceptată' : '❌ Demisie Respinsă',
      message: status === 'ACCEPTED'
        ? `Demisia ta a fost acceptată de ${demisie.approver?.username}.`
        : `Demisia ta a fost respinsă de ${demisie.approver?.username}.`,
    })
  }

  return NextResponse.json({ demisie })
}
