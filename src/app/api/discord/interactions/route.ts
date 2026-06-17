import { NextRequest, NextResponse } from 'next/server'
import nacl from 'tweetnacl'
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/notifications'

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!
const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']

const JAF_CONFIG: Record<string, { label: string; points: number }> = {
  vinewood: { label: '🎬 Vinewood Bank',      points: 1.5 },
  alta:     { label: '🏦 Alta Bank',          points: 1.5 },
  desert:   { label: '🏜️ Desert Heist',       points: 1.5 },
  highway:  { label: '🛣️ Highway Robbery',    points: 1.5 },
  pacific:  { label: '🌊 Pacific Standard',   points: 2   },
  blaine:   { label: '⛰️ Blaine County Bank', points: 2   },
  biju:     { label: '💎 Bijuterie',          points: 2   },
}

async function verifySignature(req: NextRequest, rawBody: string) {
  const signature = req.headers.get('x-signature-ed25519')
  const timestamp  = req.headers.get('x-signature-timestamp')
  if (!signature || !timestamp) return false

  return nacl.sign.detached.verify(
    Buffer.from(timestamp + rawBody),
    Buffer.from(signature, 'hex'),
    Buffer.from(PUBLIC_KEY, 'hex')
  )
}

function buildRichMessage(label: string, successLines: string[], failLines: string[], callerName: string, total: number) {
  const divider = '━━━━━━━━━━━━━━━━━━━━'
  return [
    `## 🏴 ${label}`,
    divider,
    successLines.length ? successLines.join('\n') : null,
    failLines.length ? failLines.join('\n') : null,
    divider,
    `*Procesat de* **${callerName}** *· ${total} membri recompensați*`,
  ].filter(Boolean).join('\n')
}

async function awardPoints(userIds: string[], points: number, reasonLabel: string, callerName: string) {
  const successLines: string[] = []
  const failLines: string[]    = []

  for (const discordId of userIds) {
    const user = await prisma.user.findUnique({ where: { discordId } })
    if (!user) {
      failLines.push(`> ⚠️ <@${discordId}> — neînregistrat pe site`)
      continue
    }

    await prisma.user.update({
      where: { id: user.id },
      data:  { points: { increment: points } },
    })
    await prisma.pointHistory.create({
      data: {
        userId:      user.id,
        moderatorId: user.id,
        amount:      points,
        reason:      `${reasonLabel} — procesat de ${callerName}`,
      },
    })
    await notify({
      userId:  user.id,
      type:    'task',
      title:   `💰 ${reasonLabel}`,
      message: `Ai primit +${points} Grove Coins!`,
    })

    successLines.push(`> ✅ <@${discordId}> **+${points} pts**`)
  }

  return { successLines, failLines }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const valid   = await verifySignature(req, rawBody)

  if (!valid) {
    return NextResponse.json({ error: 'Semnatura invalida' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)

  if (body.type === 1) {
    return NextResponse.json({ type: 1 })
  }

  if (body.type === 2) {
    const commandName = body.data.name
    const memberRoles: string[] = body.member?.roles || []
    const callerName  = body.member?.nick || body.member?.user?.username || 'Necunoscut'

    const isLeader = memberRoles.some(r => LEADERSHIP_ROLES.includes(r))
    if (!isLeader) {
      return NextResponse.json({
        type: 4,
        data: { content: '🚫 **Acces interzis** — doar Lider sau Co-Lider pot folosi această comandă.', flags: 64 },
      })
    }

    const options  = body.data.options || []
    const useriRaw = options.find((o: any) => o.name === 'useri')?.value as string | undefined

    if (commandName === 'jaf-procesat') {
      const jafType = options.find((o: any) => o.name === 'tip-jaf')?.value as string | undefined

      if (!useriRaw || !jafType || !JAF_CONFIG[jafType]) {
        return NextResponse.json({
          type: 4,
          data: { content: '⚠️ Trebuie să specifici tip-jaf și useri valizi.', flags: 64 },
        })
      }

      const userIds = Array.from(useriRaw.matchAll(/<@!?(\d+)>/g)).map((m: any) => m[1])
      if (!userIds.length) {
        return NextResponse.json({
          type: 4,
          data: { content: '⚠️ Nicio mențiune validă găsită.', flags: 64 },
        })
      }

      const { label, points } = JAF_CONFIG[jafType]
      const { successLines, failLines } = await awardPoints(userIds, points, label, callerName)
      const content = buildRichMessage(label, successLines, failLines, callerName, userIds.length)

      return NextResponse.json({ type: 4, data: { content } })
    }

    if (commandName === 'taxa24h') {
      if (!useriRaw) {
        return NextResponse.json({
          type: 4,
          data: { content: '⚠️ Trebuie să specifici useri.', flags: 64 },
        })
      }

      const userIds = Array.from(useriRaw.matchAll(/<@!?(\d+)>/g)).map((m: any) => m[1])
      if (!userIds.length) {
        return NextResponse.json({
          type: 4,
          data: { content: '⚠️ Nicio mențiune validă găsită.', flags: 64 },
        })
      }

      const label = '⏰ Taxa 24 Ore'
      const { successLines, failLines } = await awardPoints(userIds, 10, label, callerName)
      const content = buildRichMessage(label, successLines, failLines, callerName, userIds.length)

      return NextResponse.json({ type: 4, data: { content } })
    }

    if (commandName === 'activitate') {
      const puncteRaw = options.find((o: any) => o.name === 'puncte')?.value
      const puncte = typeof puncteRaw === 'string' ? parseFloat(puncteRaw) : puncteRaw

      if (!puncte || !useriRaw) {
        return NextResponse.json({
          type: 4,
          data: { content: '⚠️ Trebuie să specifici puncte și useri.', flags: 64 },
        })
      }

      const userIds = Array.from(useriRaw.matchAll(/<@!?(\d+)>/g)).map((m: any) => m[1])
      if (!userIds.length) {
        return NextResponse.json({
          type: 4,
          data: { content: '⚠️ Nicio mențiune validă găsită.', flags: 64 },
        })
      }

      const label = '⭐ Activitate'
      const { successLines, failLines } = await awardPoints(userIds, puncte, label, callerName)
      const content = buildRichMessage(label, successLines, failLines, callerName, userIds.length)

      return NextResponse.json({ type: 4, data: { content } })
    }

    return NextResponse.json({
      type: 4,
      data: { content: '❌ Comandă necunoscută.', flags: 64 },
    })
  }

  return NextResponse.json({ error: 'Tip request necunoscut' }, { status: 400 })
}
