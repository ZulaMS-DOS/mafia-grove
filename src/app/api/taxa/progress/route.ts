import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

const GROVE_KILLER_ROLE_ID = '955126892984410162'

const JAF_CONFIG: Record<string, string> = {
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
  const { error } = await requireLeadership()
  if (error) return error

  const weekStart = getWeekStart()
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  // Ia task-ul Grove Killer din saptamana curenta
  const taxItems = await (prisma as any).taxItem.findMany({
    where: { weekStart, targetRoles: { has: GROVE_KILLER_ROLE_ID } },
  })

  // Ia toti Grove Killerii
  const groveKillers = await prisma.user.findMany({
    where:  { roleIds: { has: GROVE_KILLER_ROLE_ID } },
    select: { id: true, username: true, avatar: true, discordId: true },
  })

  // Calculeaza progresul per user
  const progress = []
  for (const user of groveKillers) {
    const pointHistory = await prisma.pointHistory.findMany({
      where: {
        userId:    user.id,
        createdAt: { gte: weekStart, lt: weekEnd },
        reason:    { contains: '— procesat de' },
      },
    })

    // Numar jafurile procesate
    const processedCounts: Record<string, number> = {}
    for (const ph of pointHistory) {
      for (const [label, key] of Object.entries(JAF_CONFIG)) {
        if (ph.reason.includes(label)) {
          processedCounts[key] = (processedCounts[key] || 0) + 1
        }
      }
    }

    // Calculeaza progresul per item din taxa
    const itemProgress = taxItems.map((item: any) => {
      const jafuri: { type: string; count: number }[] = item.jafuri || []
      const jafProgress = jafuri.map(jaf => ({
        type:     jaf.type,
        required: jaf.count,
        done:     Math.min(processedCounts[jaf.type] || 0, jaf.count),
      }))
      const totalRequired = jafuri.reduce((s, j) => s + j.count, 0)
      const totalDone     = jafProgress.reduce((s, j) => s + j.done, 0)
      return {
        itemName:      item.name,
        jafProgress,
        totalRequired,
        totalDone,
        completed:     totalDone >= totalRequired,
      }
    })

    const allCompleted = itemProgress.every((i: any) => i.completed)

    progress.push({
      userId:        user.id,
      username:      user.username,
      avatar:        user.avatar,
      itemProgress,
      allCompleted,
    })
  }

  return NextResponse.json({ progress, taxItems })
}
