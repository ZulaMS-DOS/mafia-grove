import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireFineGiver, requireLeadership } from '@/lib/middleware'

export async function GET() {
  const { error } = await requireFineGiver()
  if (error) return error

  const [fines, members] = await Promise.all([
    (prisma as any).fine.findMany({
      orderBy: { createdAt: 'desc' },
      take:    100,
      include: { user: { select: { username: true, avatar: true, discordId: true } } },
    }),
    prisma.user.findMany({
      where: {
        roleIds: { hasSome: ['955126889171804170','955126890472022066','1462444900388704317','1501319885488390184','1342912254542348298','955126892984410162'] }
      },
      orderBy: { username: 'asc' },
      select:  { id: true, username: true, avatar: true, discordId: true },
    })
  ])

  // Separa amenzile de fw-uri
  const amenzi = fines.filter((f: any) => f.tip === 'amenda' || !f.tip)
  const fwuri  = fines.filter((f: any) => f.tip === 'fw')

  return NextResponse.json({ fines, amenzi, fwuri, members })
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireLeadership()
  if (error) return error

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID lipsa' }, { status: 400 })

  await (prisma as any).fine.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
