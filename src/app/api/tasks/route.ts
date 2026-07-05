import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { checkRateLimit } from '@/lib/rateLimit'
import { notify } from '@/lib/notifications'

const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']

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

  const userId = session!.user.id

  const rl = checkRateLimit(`task-claim:${userId}`, { windowMs: 60_000, max: 15 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Prea multe acțiuni! Mai încearcă în ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    )
  }

  const { taskId } = await req.json()
  if (!taskId) {
    return NextResponse.json({ error: 'taskId lipsă' }, { status: 400 })
  }

  try {
    const claim = await prisma.$transaction(async (tx) => {
      const task = await (tx as any).task.findUnique({
        where:   { id: taskId },
        include: { _count: { select: { claims: { where: { status: 'APPROVED' } } } } },
      })

      if (!task || !task.active) throw new Error('NOT_FOUND')
      if (task.stock !== -1 && task._count.claims >= task.stock) throw new Error('FULL')

      const existing = await (tx as any).taskClaim.findUnique({
        where: { taskId_userId: { taskId, userId } },
      })
      if (existing) throw new Error('ALREADY_CLAIMED')

      return (tx as any).taskClaim.create({
        data: { taskId, userId },
      })
    })

    // Notifica Lider/Co-Lider ca cineva a preluat un task
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { username: true },
    })
    const task = await (prisma as any).task.findUnique({
      where:  { id: taskId },
      select: { title: true },
    })
    const leaders = await prisma.user.findMany({
      where:  { roleIds: { hasSome: LEADERSHIP_ROLES } },
      select: { id: true },
    })
    await Promise.all(
      leaders
        .filter(l => l.id !== userId)
        .map(l => notify({
          userId:  l.id,
          type:    'task',
          title:   '📋 Task Preluat',
          message: `${user?.username} a preluat task-ul "${task?.title}".`,
        }))
    )

    return NextResponse.json({ claim })

  } catch (e: any) {
    if (e.message === 'NOT_FOUND')       return NextResponse.json({ error: 'Task inexistent' }, { status: 404 })
    if (e.message === 'FULL')            return NextResponse.json({ error: 'Stoc epuizat!' }, { status: 400 })
    if (e.message === 'ALREADY_CLAIMED') return NextResponse.json({ error: 'Ai preluat deja acest task!' }, { status: 400 })
    if (e.code === 'P2002')              return NextResponse.json({ error: 'Ai preluat deja acest task!' }, { status: 400 })
    throw e
  }
}
