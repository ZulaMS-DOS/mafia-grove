import { NextRequest, NextResponse } from 'next/server'
import nacl from 'tweetnacl'
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/notifications'

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!
const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']

const JAF_LABELS: Record<string, string> = {
  alta:    '🏦 Alta Bank',
  vinewood:'🎬 Vinewood Bank',
  highway: '🛣️ Highway Robbery',
  desert:  '🏜️ Desert Heist',
  blaine:  '⛰️ Blaine County Bank',
  pacific: '🌊 Pacific Standard',
  atm:     '💳 ATM Run',
  biju:    '💎 Bijuterie',
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
    const callerId    = body.member?.user?.id
    const callerName  = body.member?.nick || body.member?.user?.username || 'Necunoscut'

    if (commandName === 'jaf-procesat') {
      const isLeader = memberRoles.some(r => LEADERSHIP_ROLES.includes(r))
      if (!isLeader) {
        return NextResponse.json({
          type: 4,
          data: {
            content: '🚫 **Acces interzis** — doar Lider sau Co-Lider pot procesa jafuri.',
            flags: 64,
          },
        })
      }

      const options  = body.data.options || []
      const puncteRaw = options.find((o: any) => o.name === 'puncte')?.value
      const useriRaw  = options.find((o: any) => o.name === 'useri')?.value as string | undefined
      const jafType   = options.find((o: any) => o.name === 'tip-jaf')?.value as string | undefined

      const puncte = typeof puncteRaw === 'string' ? parseFloat(puncteRaw) : puncteRaw

      if (!puncte || !useriRaw || !jafType) {
        return NextResponse.json({
          type: 4,
          data: { content: '⚠️ Trebuie să specifici toate câmpurile: tip-jaf, puncte, useri.', flags: 64 },
        })
      }

      const userIds = Array.from(useriRaw.matchAll(/<@!?(\d+)>/g)).map((m: any) => m[1])

      if (!userIds.length) {
        return NextResponse.json({
          type: 4,
          data: { content: '⚠️ Nicio mențiune validă găsită.', flags: 64 },
        })
      }

      const jafLabel = JAF_LABELS[jafType] || jafType

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
          data:  { points: { increment: puncte } },
        })
        await prisma.pointHistory.create({
          data: {
            userId:      user.id,
            moderatorId: user.id,
            amount:      Math.round(puncte),
            reason:      `${jafLabel} — procesat de ${callerName}`,
          },
        })
        await notify({
          userId:  user.id,
          type:    'task',
          title:   `💰 ${jafLabel} Procesat`,
          message: `Ai primit +${puncte} Grove Coins pentru participarea la jaf!`,
        })

        successLines.push(`> ✅ <@${discordId}> **+${puncte} pts**`)
      }

      const divider = '━━━━━━━━━━━━━━━━━━━━'
      const content = [
        `## 🏴 ${jafLabel}`,
        divider,
        successLines.length ? successLines.join('\n') : null,
        failLines.length ? failLines.join('\n') : null,
        divider,
        `*Procesat de* **${callerName}** *· ${userIds.length} membri recompensați*`,
      ].filter(Boolean).join('\n')

      return NextResponse.json({
        type: 4,
        data: { content },
      })
    }

    return NextResponse.json({
      type: 4,
      data: { content: '❌ Comandă necunoscută.', flags: 64 },
    })
  }

  return NextResponse.json({ error: 'Tip request necunoscut' }, { status: 400 })
}
