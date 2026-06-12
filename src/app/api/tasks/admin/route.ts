import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

// GET — toate taskurile + claim-urile pending
export async function GET() {
  const { error } = await requireLeadership()
  if (error) return error

  const [tasks, pending] = await Promise.all([
    (prisma as any).task.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { claims: true } },
      },
    }),
    (prisma as any).taskClaim.findMany({
      where:   { status: 'PENDING' },
      orderBy: { claimedAt: 'desc' },
      include: {
        user: { select: { username: true, avatar: true, discordId: true } },
        task: { select: { title: true, points: true } },
      },
    }),
  ])

  return NextResponse.json({ tasks, pending })
}

// POST — creeaza task nou
export async function POST(req: NextRequest) {
  const { session, error } = await requireLeadership()
  if (error) return error

  const { title, description, points, stock } = await req.json()
  if (!title || !description || points === undefined) {
    return NextResponse.json({ error: 'Completează toate câmpurile' }, { status: 400 })
  }

  const task = await (prisma as any).task.create({
    data: {
      title,
      description,
      points:    parseInt(points),
      stock:     stock !== undefined ? parseInt(stock) : -1,
      createdBy: session!.user.id,
    },
  })
  return NextResponse.json({ task })
}

// PATCH — aproba / respinge claim
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireLeadership()
  if (error) return error

  const { claimId, status } = await req.json()
  if (!claimId || !['APPROVED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
  }

  const claim = await (prisma as any).taskClaim.update({
    where: { id: claimId },
    data: {
      status,
      reviewedBy: session!.user.id,
      reviewedAt: new Date(),
    },
    include: {
      user: { select: { id: true, username: true } },
      task: { select: { title: true, points: true } },
    },
  })

  // Daca e aprobat, acorda punctele
  if (status === 'APPROVED') {
    await prisma.user.update({
      where: { id: claim.user.id },
      data:  { points: { increment: claim.task.points } },
    })
    await prisma.pointHistory.create({
      data: {
        userId:      claim.user.id,
        moderatorId: session!.user.id,
        amount:      claim.task.points,
        reason:      `Task completat: ${claim.task.title}`,
      },
    })
  }

  return NextResponse.json({ claim })
}

// DELETE — dezactiveaza task
export async function DELETE(req: NextRequest) {
  const { error } = await requireLeadership()
  if (error) return error

  const { id } = await req.json()
  await (prisma as any).task.update({ where: { id }, data: { active: false } })
  return NextResponse.json({ success: true })
}
