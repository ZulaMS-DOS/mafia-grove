import { prisma } from '@/lib/prisma'

interface NotifyParams {
  userId:  string
  type:    'announcement' | 'tax' | 'leave' | 'resignation' | 'task' | 'fine'
  title:   string
  message: string
}

export async function notify({ userId, type, title, message }: NotifyParams) {
  return (prisma as any).notification.create({
    data: { userId, type, title, message },
  })
}

export async function notifyAll(params: Omit<NotifyParams, 'userId'>) {
  const users = await prisma.user.findMany({ select: { id: true } })
  return Promise.all(
    users.map(u => notify({ ...params, userId: u.id }))
  )
}

export async function notifyAllExcept(userId: string, params: Omit<NotifyParams, 'userId'>) {
  const users = await prisma.user.findMany({
    where:  { id: { not: userId } },
    select: { id: true },
  })
  return Promise.all(
    users.map(u => notify({ ...params, userId: u.id }))
  )
}
