import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { notify } from '@/lib/notifications'

const LEADERSHIP_ROLES  = ['955126889171804170','955126890472022066']
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const NOTIFY_CHANNEL_ID = '1522391429899358298'

const GRADE_LABELS: Record<string, string> = {
  '955126889171804170':  'Lider',
  '955126890472022066':  'Co-Lider',
  '1462444900388704317': 'Tester',
  '1501319885488390184': 'Membru',
  '955126892984410162':  'Grove Killer',
  '1342912254542348298': 'Muncitor',
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

async function sendDiscordMessage(content: string) {
  try {
    await fetch(`https://discord.com/api/v10/channels/${NOTIFY_CHANNEL_ID}/messages`, {
      method:  'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ content }),
    })
  } catch {}
}

async function buildUnpaidList(item: any, weekStart: Date): Promise<string[]> {
  // Gaseste toti userii care trebuie sa plateasca aceasta taxa
  const targetRoles: string[] = item.targetRoles || []

  const allUsers = await prisma.user.findMany({
    where: targetRoles.length > 0
      ? { roleIds: { hasSome: targetRoles } }
      : {},
    select: { id: true, username: true, discordId: true },
  })

  // Gaseste cine a platit
  const payments = await (prisma as any).taxPayment.findMany({
    where: {
      weekStart,
      paid:   true,
      userId: { in: allUsers.map((u: any) => u.id) },
    },
    select: { userId: true },
  })
  const paidIds = new Set(payments.map((p: any) => p.userId))

  // Returneaza lista celor care NU au platit
  return allUsers
    .filter((u: any) => !paidIds.has(u.id))
    .map((u: any) => `> ❌ <@${u.discordId}> (${u.username})`)
}

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const weekStart = getWeekStart()
  const userId    = session!.user.id
  const myRoleIds = session!.user.roleIds || []
  const now       = new Date()

  const [allItems, payment] = await Promise.all([
    (prisma as any).taxItem.findMany({
      where:   { weekStart },
      orderBy: { createdAt: 'asc' },
    }),
    (prisma as any).taxPayment.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    }),
  ])

  // Filtreaza dupa gradul userului
  const filtered = allItems.filter((item: any) =>
    !item.targetRoles?.length || item.targetRoles.some((r: string) => myRoleIds.includes(r))
  )

  const items = filtered.map((item: any) => ({
    ...item,
    expired: item.termen ? new Date(item.termen) < now : false,
  }))

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const dayAfterTomorrow = new Date(tomorrow)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setDate(todayEnd.getDate() + 1)

  const expiringTomorrow = allItems.filter((item: any) => {
    if (!item.termen) return false
    const t = new Date(item.termen)
    return t >= tomorrow && t < dayAfterTomorrow
  })

  const expiringToday = allItems.filter((item: any) => {
    if (!item.termen) return false
    const t = new Date(item.termen)
    return t >= today && t < todayEnd
  })

  // Notificari taxe care expira maine
  for (const item of expiringTomorrow) {
    const alreadyNotified = await (prisma as any).notification.findFirst({
      where: {
        type:      'tax',
        title:     '⏰ Taxă Expiră Mâine',
        message:   { contains: item.name },
        createdAt: { gte: today },
      },
    })

    if (!alreadyNotified) {
      const leaders = await prisma.user.findMany({
        where:  { roleIds: { hasSome: LEADERSHIP_ROLES } },
        select: { id: true },
      })
      await Promise.all(
        leaders.map(l => notify({
          userId:  l.id,
          type:    'tax',
          title:   '⏰ Taxă Expiră Mâine',
          message: `Taxa "${item.name}" expiră mâine! Verifică plățile.`,
        }))
      )

      // Construieste lista grade tinta
      const targetRoles: string[] = item.targetRoles || []
      const gradeText = targetRoles.length > 0
        ? targetRoles.map((r: string) => GRADE_LABELS[r] || r).join(', ')
        : 'Toți membrii'

      // Construieste lista neplatitori
      const unpaidLines = await buildUnpaidList(item, weekStart)
      const unpaidText = unpaidLines.length > 0
        ? unpaidLines.join('\n')
        : '> ✅ Toți au achitat!'

      await sendDiscordMessage(
        `## ⏰ Taxă Sindicat — Expiră Mâine!\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `> 📋 **${item.name}**\n` +
        `> 👥 **Grade vizate:** ${gradeText}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `**Membri care NU au achitat (${unpaidLines.length}):**\n` +
        `${unpaidText}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<@&955126889171804170> <@&955126890472022066>`
      )
    }
  }

  // Notificari taxe care expira azi
  for (const item of expiringToday) {
    const alreadyNotified = await (prisma as any).notification.findFirst({
      where: {
        type:      'tax',
        title:     '🚨 Taxă Expiră Azi',
        message:   { contains: item.name },
        createdAt: { gte: today },
      },
    })

    if (!alreadyNotified) {
      const leaders = await prisma.user.findMany({
        where:  { roleIds: { hasSome: LEADERSHIP_ROLES } },
        select: { id: true },
      })
      await Promise.all(
        leaders.map(l => notify({
          userId:  l.id,
          type:    'tax',
          title:   '🚨 Taxă Expiră Azi',
          message: `Taxa "${item.name}" expiră AZI! Acționați urgent.`,
        }))
      )

      const targetRoles: string[] = item.targetRoles || []
      const gradeText = targetRoles.length > 0
        ? targetRoles.map((r: string) => GRADE_LABELS[r] || r).join(', ')
        : 'Toți membrii'

      const unpaidLines = await buildUnpaidList(item, weekStart)
      const unpaidText = unpaidLines.length > 0
        ? unpaidLines.join('\n')
        : '> ✅ Toți au achitat!'

      await sendDiscordMessage(
        `## 🚨 Taxă Sindicat — Expiră AZI!\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `> 📋 **${item.name}**\n` +
        `> 👥 **Grade vizate:** ${gradeText}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `**Membri care NU au achitat (${unpaidLines.length}):**\n` +
        `${unpaidText}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<@&955126889171804170> <@&955126890472022066>`
      )
    }
  }

  return NextResponse.json({
    items,
    paid:      payment?.paid   ?? false,
    paidAt:    payment?.paidAt ?? null,
    weekStart: weekStart.toISOString(),
  })
}
