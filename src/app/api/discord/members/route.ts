import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

const DISCORD_GUILD_ID  = process.env.DISCORD_GUILD_ID!
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!

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

export async function GET() {
  const discordMembers = await fetchAllDiscordMembers()
  const discordIds      = new Set(discordMembers.map(m => m.user.id))

  for (const m of discordMembers) {
    const discordId = m.user.id
    const username  = m.nick || m.user.global_name || m.user.username
    const roleIds    = m.roles || []
    const avatar    = m.user.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${m.user.avatar}.png`
      : null

    await prisma.user.upsert({
      where:  { discordId },
      update: { username, roleIds, avatar },
      create: { discordId, username, roleIds, avatar, points: 0 },
    })
  }

  const dbUsers = await prisma.user.findMany({ select: { id: true, discordId: true } })
  const toDelete = dbUsers.filter(u => !discordIds.has(u.discordId))

  if (toDelete.length) {
    await prisma.user.deleteMany({
      where: { id: { in: toDelete.map(u => u.id) } },
    })
  }

  return {
    totalOnServer: discordMembers.length,
    deleted:       toDelete.length,
    deletedUsers:  toDelete.map(u => u.discordId),
  }
}

export async function GET() {
  const { error } = await requireLeadership()
  if (error) return error

  try {
    const result = await syncDiscordMembers()
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Eroare sincronizare' }, { status: 500 })
  }
}
