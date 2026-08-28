import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

const GROVE_KILLER_ROLE_ID = '1518710460717731840'

const JAF_LABELS: Record<string, string> = {
  '🎬 Vinewood Bank':      'vinewood',
  '🏦 Alta Bank':          'alta',
  '🏜️ Desert Heist':       'desert',
  '🛣️ Highway Robbery':    'highway',
  '🌊 Pacific Standard':   'pacific',
  '⛰️ Blaine County Bank': 'blaine',
  '💎 Bijuterie':          'biju',
  '💳 ATM Run':            'atm',
  '🏪 Magazin':            'magazin',
  '💻 Digital Den':        'digital_den',
}

function getWeekStart() {
  const now  = new Date()
  const day  = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const weekStart = getWeekStart()
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const taxItems = await (prisma as any).taxItem.findMany({
    where: { weekStart, targetRoles: { has: GROVE_KILLER_ROLE_ID } },
  })

  if (!taxItems.length) return NextResponse.json({ progress: null })

  const groveKillers = await prisma.user.findMany({
    where:  { roleIds: { has: GROVE_KILLER_ROLE_ID } },
    select: { id: true },
  })

  const allProcessed = await prisma.pointHistory.findMany({
    where: {
      userId:    { in: groveKillers.map(u => u.id) },
      createdAt: { gte: weekStart, lt: weekEnd },
      reason:    { contains: '— procesat de' },
    },
    select: { reason: true },
  })

  const collectiveCounts: Record<string, number> = {}
  for (const ph of allProcessed) {
    for (const [label, key] of Object.entries(JAF_LABELS)) {
      if (ph.reason.includes(label)) {
        collectiveCounts[key] = (collectiveCounts[key] || 0) + 1
      }
    }
  }

  const itemProgress = taxItems.map((item: any) => {
    const jafuri: { type: string; count: number }[] = item.jafuri || []
    const jafProgress = jafuri.map(jaf => ({
      type:     jaf.type,
      required: jaf.count,
      done:     Math.min(collectiveCounts[jaf.type] || 0, jaf.count),
    }))
    const totalRequired = jafuri.reduce((s, j) => s + j.count, 0)
    const totalDone     = jafProgress.reduce((s, j) => s + j.done, 0)
    return { itemName: item.name, jafProgress, totalRequired, totalDone, completed: totalRequired > 0 && totalDone >= totalRequired }
  })

  return NextResponse.json({
    progress: {
      itemProgress,
      allCompleted: itemProgress.every((i: any) => i.completed),
    },
  })
}
