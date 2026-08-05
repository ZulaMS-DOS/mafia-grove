import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireFineGiver } from '@/lib/middleware'

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const DISCORD_GUILD_ID  = process.env.DISCORD_GUILD_ID!
const FW_CHANNEL_ID     = '1342941323367288852'
const AMENDA_CHANNEL_ID = '1446452930310832219'
const DIVIDER           = '━━━━━━━━━━━━━━━━━━━━'

const FW_ROLES: Record<number, string> = {
  1: '955132772249387048',
  2: '955132770504540182',
  3: '1051049847551184956',
}

async function sendDiscordMessage(channelId: string, content: string) {
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method:  'POST',
      headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content }),
    })
  } catch {}
}

async function addRole(discordId: string, roleId: string) {
  try {
    await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}/roles/${roleId}`,
      { method: 'PUT', headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` } }
    )
  } catch {}
}

async function removeRole(discordId: string, roleId: string) {
  try {
    await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}/roles/${roleId}`,
      { method: 'DELETE', headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` } }
    )
  } catch {}
}

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = session!.user.id

  const fines = await (prisma as any).fine.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    50,
  })

  return NextResponse.json({ fines })
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireFineGiver()
  if (error) return error

 const { userId, tip, motiv, material, bucati, termen, fwLevel } = await req.json()
  if (!userId || !material) {
    return NextResponse.json({ error: 'Membru și material obligatorii' }, { status: 400 })
  }

  const tipFinal = tip === 'fw' ? 'fw' : 'amenda'

  const fine = await (prisma as any).fine.create({
    data: {
      userId,
      tip:         tipFinal,
      motiv:       motiv?.trim() || '',
      material,
      bucati:      parseInt(bucati) || 0,
      termen:      termen?.trim()   || '',
      fwLevel:     fwLevel ? parseInt(fwLevel) : null,
      givenBy:     session!.user.id,
      givenByName: session!.user.name,
    },
  })

  if (tipFinal === 'fw') {
    const newFwLevel = parseInt(fwLevel)

    // Calculeaza FW-urile anterioare
    const previousFws = await (prisma as any).fine.findMany({
      where:   { userId, tip: 'fw', id: { not: fine.id } },
      orderBy: { createdAt: 'asc' },
      select:  { fwLevel: true },
    })

    // Total FW curent (max 3)
    const totalFw = Math.min(
      previousFws.reduce((sum: number, f: any) => sum + (f.fwLevel || 1), 0) + newFwLevel,
      3
    )

    // Istoric
    const history = [
      ...previousFws.map((f: any) => `FW ${f.fwLevel}/3`),
      `FW ${newFwLevel}/3`,
    ]
    const historyText = history.length > 1
      ? `${history.join(' + ')} = FW ${totalFw}/3`
      : `FW ${totalFw}/3`

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { username: true, discordId: true },
    })

    if (user?.discordId) {
      // Scoate gradele FW anterioare si adauga cel nou
      for (const [level, roleId] of Object.entries(FW_ROLES)) {
        if (parseInt(level) !== totalFw) {
          await removeRole(user.discordId, roleId)
        }
      }
      if (FW_ROLES[totalFw]) {
        await addRole(user.discordId, FW_ROLES[totalFw])
      }

      // Mesaj Discord FW
      await sendDiscordMessage(
        FW_CHANNEL_ID,
        `## 🚨 Faction Warn — ${user.username}\n` +
        `${DIVIDER}\n` +
        `> 👤 **Membru:** <@${user.discordId}>\n` +
        `> 📋 **Motiv:** ${material}\n` +
        `> 📊 **Istoric:** ${historyText}\n` +
        `> 👮 **Dat de:** ${session!.user.name}\n` +
        `${DIVIDER}`
      )
    }

    // Log FW
    await (prisma as any).botLog.create({
      data: {
        categorie: 'jafuri',
        titlu:     `🚨 FW ${totalFw}/3 — ${user?.username || 'Necunoscut'}`,
        continut:
          `Membru: ${user?.username}\n` +
          `Motiv: ${material}\n` +
          `Istoric: ${historyText}\n` +
          `Dat de: ${session!.user.name}`,
      },
    })

  } else {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { username: true, discordId: true },
    })

    // Mesaj Discord Amendă
    await sendDiscordMessage(
      AMENDA_CHANNEL_ID,
      `## ⚠️ Amendă — ${user?.username || 'Necunoscut'}\n` +
      `${DIVIDER}\n` +
      `> 👤 **Membru:** <@${user?.discordId}>\n` +
      `> 📋 **Motiv:** ${material}\n` +
      `${bucati ? `> 📦 **Cantitate:** ${bucati} buc\n` : ''}` +
      `${termen ? `> ⏰ **Termen:** ${termen}\n` : ''}` +
      `> 👮 **Dat de:** ${session!.user.name}\n` +
      `${DIVIDER}`
    )

    // Log Amendă
    await (prisma as any).botLog.create({
      data: {
        categorie: 'jafuri',
        titlu:     `⚠️ Amendă — ${user?.username || 'Necunoscut'}`,
        continut:
          `Membru: ${user?.username}\n` +
          `Material: ${material}\n` +
          `Bucăți: ${bucati || 0}\n` +
          `Termen: ${termen || '—'}\n` +
          `Dat de: ${session!.user.name}`,
      },
    })
  }

  return NextResponse.json({ fine })
}
