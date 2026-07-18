import { NextRequest, NextResponse } from 'next/server'
import nacl from 'tweetnacl'
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/notifications'

const PUBLIC_KEY        = process.env.DISCORD_PUBLIC_KEY!
const DISCORD_APP_ID    = process.env.DISCORD_CLIENT_ID!
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const LEADERSHIP_ROLES  = ['955126889171804170', '955126890472022066']
const JAF_ALLOWED_ROLES = ['955126889171804170', '955126890472022066', '1348974812315258972']
const SUPER_ADMIN_ID    = '949760812518617138'

const JAF_CONFIG: Record<string, { label: string; points: number }> = {
  vinewood:    { label: '🎬 Vinewood Bank',      points: 1.5 },
  alta:        { label: '🏦 Alta Bank',          points: 1.5 },
  desert:      { label: '🏜️ Desert Heist',       points: 1.5 },
  highway:     { label: '🛣️ Highway Robbery',    points: 1.5 },
  pacific:     { label: '🌊 Pacific Standard',   points: 2   },
  blaine:      { label: '⛰️ Blaine County Bank', points: 2   },
  biju:        { label: '💎 Bijuterie',          points: 2   },
  atm:         { label: '💳 ATM Run',            points: 1.5 },
  magazin:     { label: '🏪 Magazin',            points: 1   },
  digital_den: { label: '💻 Digital Den',        points: 2   },
}

async function verifySignature(req: NextRequest, rawBody: string) {
  const signature = req.headers.get('x-signature-ed25519')
  const timestamp = req.headers.get('x-signature-timestamp')
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
    failLines.length    ? failLines.join('\n')    : null,
    divider,
    `*Procesat de* **${callerName}** *· ${total} membri recompensați*`,
  ].filter(Boolean).join('\n')
}

async function sendDM(discordId: string, content: string) {
  try {
    const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method:  'POST',
      headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ recipient_id: discordId }),
    })
    const dm = await dmRes.json()
    if (!dm.id) return
    await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
      method:  'POST',
      headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content }),
    })
  } catch {}
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

async function sendFollowup(token: string, content: string) {
  await fetch(`https://discord.com/api/v10/webhooks/${DISCORD_APP_ID}/${token}/messages/@original`, {
    method:  'PATCH',
    headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ content }),
  })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const valid   = await verifySignature(req, rawBody)
  if (!valid) return NextResponse.json({ error: 'Semnatura invalida' }, { status: 401 })

  const body = JSON.parse(rawBody)

  if (body.type === 1) return NextResponse.json({ type: 1 })

  if (body.type === 2) {
    const commandName   = body.data.name
    const memberRoles: string[] = body.member?.roles || []
    const callerName    = body.member?.nick || body.member?.user?.username || 'Necunoscut'
    const callerDiscordId = body.member?.user?.id as string | undefined
    const token         = body.token

    const isLeader      = memberRoles.some(r => LEADERSHIP_ROLES.includes(r))
    const canProcessJaf = memberRoles.some(r => JAF_ALLOWED_ROLES.includes(r))
    const options       = body.data.options || []
    const useriRaw      = options.find((o: any) => o.name === 'useri')?.value as string | undefined

    // ── /jaf-procesat — Lider, Co-Lider SAU Responsabil Jafuri ──
    if (commandName === 'jaf-procesat') {
      if (!canProcessJaf) {
        return NextResponse.json({
          type: 4,
          data: { content: '🚫 **Acces interzis** — doar Lider, Co-Lider sau Responsabil Jafuri pot procesa jafuri.', flags: 64 },
        })
      }

      const deferResponse = NextResponse.json({ type: 5 })

      ;(async () => {
        try {
          const jafType = options.find((o: any) => o.name === 'tip-jaf')?.value as string | undefined

          if (!useriRaw || !jafType || !JAF_CONFIG[jafType]) {
            await sendFollowup(token, '⚠️ Trebuie să specifici tip-jaf și useri valizi.')
            return
          }

          const userIds = Array.from(useriRaw.matchAll(/<@!?(\d+)>/g)).map((m: any) => m[1])
          if (!userIds.length) {
            await sendFollowup(token, '⚠️ Nicio mențiune validă găsită.')
            return
          }

          const { label, points } = JAF_CONFIG[jafType]
          const { successLines, failLines } = await awardPoints(userIds, points, label, callerName)
          await sendFollowup(token, buildRichMessage(label, successLines, failLines, callerName, userIds.length))

          // DM catre tine daca altcineva a procesat
          if (callerDiscordId && callerDiscordId !== SUPER_ADMIN_ID) {
            await sendDM(
              SUPER_ADMIN_ID,
              `## 🏴 Jaf Procesat\n` +
              `**Procesat de:** ${callerName}\n` +
              `**Tip jaf:** ${label} (${points} pts)\n` +
              `**Useri recompensați (${userIds.length}):**\n` +
              `${successLines.join('\n')}`
            )
          }
        } catch (e) {
          await sendFollowup(token, '❌ A apărut o eroare. Încearcă din nou.')
        }
      })()

      return deferResponse
    }

    // ── /taxa24h și /activitate — doar Lider/Co-Lider ──
    if (!isLeader) {
      return NextResponse.json({
        type: 4,
        data: { content: '🚫 **Acces interzis** — doar Lider sau Co-Lider pot folosi această comandă.', flags: 64 },
      })
    }

    if (commandName === 'taxa24h') {
      const deferResponse = NextResponse.json({ type: 5 })
      ;(async () => {
        try {
          if (!useriRaw) { await sendFollowup(token, '⚠️ Trebuie să specifici useri.'); return }
          const userIds = Array.from(useriRaw.matchAll(/<@!?(\d+)>/g)).map((m: any) => m[1])
          if (!userIds.length) { await sendFollowup(token, '⚠️ Nicio mențiune validă găsită.'); return }
          const label = '⏰ Taxa 24 Ore'
          const { successLines, failLines } = await awardPoints(userIds, 10, label, callerName)
          await sendFollowup(token, buildRichMessage(label, successLines, failLines, callerName, userIds.length))
        } catch (e) {
          await sendFollowup(token, '❌ A apărut o eroare. Încearcă din nou.')
        }
      })()
      return deferResponse
    }

    if (commandName === 'activitate') {
      const deferResponse = NextResponse.json({ type: 5 })
      ;(async () => {
        try {
          const puncteRaw = options.find((o: any) => o.name === 'puncte')?.value
          const puncte = typeof puncteRaw === 'string' ? parseFloat(puncteRaw) : puncteRaw
          if (!puncte || !useriRaw) { await sendFollowup(token, '⚠️ Trebuie să specifici puncte și useri.'); return }
          const userIds = Array.from(useriRaw.matchAll(/<@!?(\d+)>/g)).map((m: any) => m[1])
          if (!userIds.length) { await sendFollowup(token, '⚠️ Nicio mențiune validă găsită.'); return }
          const label = '⭐ Activitate'
          const { successLines, failLines } = await awardPoints(userIds, puncte, label, callerName)
          await sendFollowup(token, buildRichMessage(label, successLines, failLines, callerName, userIds.length))
        } catch (e) {
          await sendFollowup(token, '❌ A apărut o eroare. Încearcă din nou.')
        }
      })()
      return deferResponse
    }

    return NextResponse.json({ type: 4, data: { content: '❌ Comandă necunoscută.', flags: 64 } })
  }

  return NextResponse.json({ error: 'Tip request necunoscut' }, { status: 400 })
}
