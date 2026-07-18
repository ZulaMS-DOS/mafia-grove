import { prisma } from '@/lib/prisma'

const DISCORD_GUILD_ID  = process.env.DISCORD_GUILD_ID!
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const MUNCITOR_ROLE_ID  = '1342912254542348298'
const NOTIFY_CHANNEL_ID = '1525258100599165008'

async function fetchAllDiscordMembers() {
  const allMembers: any[] = []
  let after = '0'

  while (true) {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members?limit=1000&after=${after}`,
      { headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` } }
    )
    if (!res.ok) throw new Error(`Discord API error: ${res.status}`)

    const batch = await res.json()
    if (!batch.length) break

    allMembers.push(...batch)
    after = batch[batch.length - 1].user.id

    if (batch.length < 1000) break
  }

  return allMembers
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

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

async function hasPaidTaxa(userId: string): Promise<boolean> {
  const weekStart = getWeekStart()
  const payment = await (prisma as any).taxPayment.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  })
  return payment?.paid ?? false
}

export async function syncDiscordMembers() {
  const discordMembers = await fetchAllDiscordMembers()
  const discordIds     = new Set(discordMembers.map((m: any) => m.user.id))
  const now            = new Date()

  for (const m of discordMembers) {
    const discordId  = m.user.id
    const username   = m.nick || m.user.global_name || m.user.username
    const roleIds    = m.roles || []
    const avatar     = m.user.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${m.user.avatar}.png`
      : null
    const isMuncitor = roleIds.includes(MUNCITOR_ROLE_ID)

    const existing = await prisma.user.findUnique({ where: { discordId }, select: { id: true, joinedAt: true } })

    if (existing) {
      await prisma.user.update({
        where: { discordId },
        data:  { username, roleIds, avatar },
      })
    } else {
      await prisma.user.create({
        data: {
          discordId,
          username,
          roleIds,
          avatar,
          points:   0,
          joinedAt: isMuncitor ? now : null,
        },
      })
    }
  }

  const dbUsers  = await prisma.user.findMany({ select: { id: true, discordId: true } })
  const toDelete = dbUsers.filter((u: any) => !discordIds.has(u.discordId))

  if (toDelete.length) {
    await prisma.user.deleteMany({
      where: { id: { in: toDelete.map((u: any) => u.id) } },
    })
  }

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  // ── Reminder cu O ZI ÎNAINTE de expirare ──────────────────
  const sixDaysAgo    = new Date(now)
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
  sixDaysAgo.setHours(0, 0, 0, 0)
  const sixDaysAgoEnd = new Date(sixDaysAgo)
  sixDaysAgoEnd.setDate(sixDaysAgoEnd.getDate() + 1)

  const reminderMuncitori = await prisma.user.findMany({
    where: {
      roleIds:  { has: MUNCITOR_ROLE_ID },
      joinedAt: { gte: sixDaysAgo, lt: sixDaysAgoEnd },
    },
    select: { id: true, username: true, discordId: true, joinedAt: true },
  })

  if (reminderMuncitori.length > 0) {
    const alreadyReminded = await (prisma as any).notification.findFirst({
      where: {
        type:      'task',
        title:     '⏰ Muncitori — Reminder Perioadă Probă',
        createdAt: { gte: todayStart },
      },
    })

    if (!alreadyReminded) {
      const divider = '━━━━━━━━━━━━━━━━━━━━'
      const lines = reminderMuncitori.map((u: any) =>
        `${divider}\n> 👤 <@${u.discordId}> **(${u.username})**\n> 📅 Intrat pe: ${u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('ro-RO') : '?'}\n> ⏳ Perioada de probă expiră **mâine!**`
      )

      await sendDiscordMessage(
        `## ⚠️ Muncitori — Perioadă de Probă Expiră Mâine!\n` +
        `${divider}\n` +
        lines.join('\n') + '\n' +
        `${divider}\n` +
        `<@&955126889171804170> <@&955126890472022066>`
      )

      const leaders = await prisma.user.findMany({
        where:  { roleIds: { hasSome: ['955126889171804170', '955126890472022066'] } },
        select: { id: true },
      })
      if (leaders.length > 0) {
        await (prisma as any).notification.create({
          data: {
            userId:  leaders[0].id,
            type:    'task',
            title:   '⏰ Muncitori — Reminder Perioadă Probă',
            message: `${reminderMuncitori.length} muncitori au perioada de probă ce expiră mâine.`,
          },
        })
      }
    }
  }

  // ── Expirare 7 ZILE + status taxă ─────────────────────────
  const sevenDaysAgo    = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  const sevenDaysAgoEnd = new Date(sevenDaysAgo)
  sevenDaysAgoEnd.setDate(sevenDaysAgoEnd.getDate() + 1)

  const expiringMuncitori = await prisma.user.findMany({
    where: {
      roleIds:  { has: MUNCITOR_ROLE_ID },
      joinedAt: { gte: sevenDaysAgo, lt: sevenDaysAgoEnd },
    },
    select: { id: true, username: true, discordId: true, joinedAt: true },
  })

  if (expiringMuncitori.length > 0) {
    const alreadyNotified = await (prisma as any).notification.findFirst({
      where: {
        type:      'task',
        title:     '⏰ Muncitori — Perioadă Probă Expirată',
        createdAt: { gte: todayStart },
      },
    })

    if (!alreadyNotified) {
      const divider = '━━━━━━━━━━━━━━━━━━━━'

      // Verifica taxa pentru fiecare Muncitor
      const lines: string[] = []
      for (const u of expiringMuncitori) {
        const paid = await hasPaidTaxa(u.id)
        lines.push(
          `${divider}\n` +
          `> 👤 <@${u.discordId}> **(${u.username})**\n` +
          `> 📅 Intrat pe: ${u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('ro-RO') : '?'}\n` +
          `> 💰 Taxă săptămânală: ${paid ? '✅ Achitată' : '❌ Neachitată'}`
        )
      }

      await sendDiscordMessage(
        `## ⏰ Muncitori — Perioadă de Probă Expirată!\n` +
        `${divider}\n` +
        `Următorii membri au completat **7 zile** pe server:\n` +
        `*(promovare la Membru sau eliminare din organizație)*\n` +
        lines.join('\n') + '\n' +
        `${divider}\n` +
        `<@&955126889171804170> <@&955126890472022066>`
      )

      const leaders = await prisma.user.findMany({
        where:  { roleIds: { hasSome: ['955126889171804170', '955126890472022066'] } },
        select: { id: true },
      })
      if (leaders.length > 0) {
        await (prisma as any).notification.create({
          data: {
            userId:  leaders[0].id,
            type:    'task',
            title:   '⏰ Muncitori — Perioadă Probă Expirată',
            message: `${expiringMuncitori.length} muncitori au completat 7 zile.`,
          },
        })
      }
    }
  }

  return {
    totalOnServer:     discordMembers.length,
    deleted:           toDelete.length,
    deletedUsers:      toDelete.map((u: any) => u.discordId),
    expiringMuncitori: expiringMuncitori.length,
  }
}
