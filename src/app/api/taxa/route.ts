import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { notify } from '@/lib/notifications'

const LEADERSHIP_ROLES  = ['955126889171804170','955126890472022066']
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const NOTIFY_CHANNEL_ID = '1522391429899358298'

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
  } catch (e) {
    // Esecul silentios — nu blocam pagina daca Discord e down
  }
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

  // Marcheaza itemele expirate
  const items = filtered.map((item: any) => ({
    ...item,
    expired: item.termen ? new Date(item.termen) < now : false,
  }))

  // Verifica taxe care expira maine sau azi
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const dayAfterTomorrow = new Date(tomorrow)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setDate(todayEnd.getDate() + 1)

  // Taxe care expira maine
  const expiringTomorrow = allItems.filter((item: any) => {
    if (!item.termen) return false
    const t = new Date(item.termen)
    return t >= tomorrow && t < dayAfterTomorrow
  })

  // Taxe care expira azi
  const expiringToday = allItems.filter((item: any) => {
    if (!item.termen) return false
    const t = new Date(item.termen)
    return t >= today && t < todayEnd
  })

  // Trimite notificari (verificam sa nu trimitem de mai multe ori pe zi)
  for (const item of expiringTomorrow) {
    const alreadyNotified = await (prisma as any).notification.findFirst({
      where: {
        type:    'tax',
        title:   '⏰ Taxă Expiră Mâine',
        message: { contains: item.name },
        createdAt: { gte: new Date(today) },
      },
    })

    if (!alreadyNotified) {
      // Notificare pe site pentru lideri
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

      // Notificare pe Discord
      await sendDiscordMessage(
        `## ⏰ Taxă Sindicat — Expiră Mâine!\n━━━━━━━━━━━━━━━━━━━━\n> **${item.name}** expiră mâine!\n> Verificați cine nu a achitat încă.\n━━━━━━━━━━━━━━━━━━━━\n<@&955126889171804170> <@&955126890472022066>`
      )
    }
  }

  for (const item of expiringToday) {
    const alreadyNotified = await (prisma as any).notification.findFirst({
      where: {
        type:    'tax',
        title:   '🚨 Taxă Expiră Azi',
        message: { contains: item.name },
        createdAt: { gte: new Date(today) },
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

      // Notificare pe Discord
      await sendDiscordMessage(
        `## 🚨 Taxă Sindicat — Expiră AZI!\n━━━━━━━━━━━━━━━━━━━━\n> **${item.name}** expiră **AZI**!\n> Acționați urgent — verificați plățile imediat.\n━━━━━━━━━━━━━━━━━━━━\n<@&955126889171804170> <@&955126890472022066>`
      )
    }
  }

  return NextResponse.json({
    items,
    paid:      payment?.paid    ?? false,
    paidAt:    payment?.paidAt  ?? null,
    weekStart: weekStart.toISOString(),
  })
}
