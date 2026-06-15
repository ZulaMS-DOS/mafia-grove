import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'
import { DISCORD_GUILD_ID, DISCORD_BOT_TOKEN } from '@/lib/discord'

export async function GET() {
  const { error } = await requireLeadership()
  if (error) return error

  try {
    let allMembers: any[] = []
    let after = '0'

    while (true) {
      const res = await fetch(
        `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members?limit=1000&after=${after}`,
        { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
      )

      if (!res.ok) {
        const txt = await res.text()
        return NextResponse.json({ error: `Discord API error: ${res.status} - ${txt}` }, { status: 500 })
      }

      const batch = await res.json()
      if (!Array.isArray(batch) || batch.length === 0) break

      allMembers = allMembers.concat(batch)
      if (batch.length < 1000) break
      after = batch[batch.length - 1].user.id
    }

    const humans = allMembers.filter((m: any) => !m.user.bot)

    let created = 0
    let updated = 0

    for (const m of humans) {
      const discordId = m.user.id
      const username  = m.nick || m.user.global_name || m.user.username
      const avatar    = m.user.avatar || null
      const roleIds   = m.roles || []

      const existing = await prisma.user.findUnique({ where: { discordId } })

      if (existing) {
        await prisma.user.update({
          where: { discordId },
          data:  { username, avatar, roleIds },
        })
        updated++
      } else {
        await prisma.user.create({
          data: { discordId, username, avatar, roleIds, points: 0 },
        })
        created++
      }
    }

    return NextResponse.json({ success: true, total: humans.length, created, updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Eroare necunoscuta' }, { status: 500 })
  }
}
