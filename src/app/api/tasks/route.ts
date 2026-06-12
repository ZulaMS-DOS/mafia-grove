import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireLeadership } from '@/lib/middleware'

// GET — toate taskurile active + statusul userului
export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = session!.user.id

  const [tasks, myClaims] = await Promise.all([
    (prisma as any).task.findMany({
      where:   { active: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { claims: { where: { status: 'APPROVED' } } } }
      },
    }),
    (prisma as any).taskClaim.findMany({
      where: { userId },
      select: { taskId: true, status: true },
    }),
  ])

  const claimMap = new Map(myClaims.map((c: any) => [c.taskId, c.status]))

  const tasksWithStatus = tasks.map((t: any) => ({
    ...t,
    approvedCount: t._count.claims,
    myStatus: claimMap.get(t.id) || null,
    isFull: t.stock !== -1 && t._count.claims >= t.stock,
  }))

  return NextResponse.json({ tasks: tasksWithStatus })
}

// POST — preia un task (membrul)
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { taskId } = await req.json()
  const userId     = session!.user.id

  const task = await (prisma as any).task.findUnique({
    where:   { id: taskId },
    include: { _count: { select: { claims: { where: { status: 'APPROVED' } } } } },
  })

  if (!task || !task.active) {
    return NextResponse.json({ error: 'Task inexistent' }, { status: 404 })
  }

  if (task.stock !== -1 && task._count.claims >= task.stock) {
    return NextResponse.json({ error: 'Stoc epuizat!' }, { status: 400 })
  }

  // Verifica daca l-a preluat deja
  const existing = await (prisma as any).taskClaim.findUnique({
    where: { taskId_userId: { taskId, userId } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Ai preluat deja acest task!' }, { status: 400 })
  }

  const claim = await (prisma as any).taskClaim.create({
    data: { taskId, userId },
  })

  return NextResponse.json({ claim })
}
