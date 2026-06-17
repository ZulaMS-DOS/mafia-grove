import { NextRequest, NextResponse } from 'next/server'
import nacl from 'tweetnacl'
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/notifications'

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!
const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']

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

    if (commandName === 'jaf-procesat') {
      const isLeader = memberRoles.some(r => LEADERSHIP_ROLES.includes(r))
      if (!isLeader) {
        return NextResponse.json({
          type: 4,
          data: { content: '❌ Doar Lider sau Co-Lider pot folosi această comandă.', flags: 64 },
        })
      }

      const options = body.data.options || []
      const puncte  = options.find((o: any) => o.name === 'puncte')?.value
      const useriRaw = options.find((o: any) => o.name === 'useri')?.value as string | undefined

      if (!puncte || !useriRaw) {
        return NextResponse.json({
          type: 4,
          data: { content: '❌ Trebuie să specifici puncte și useri.', flags: 64 },
        })
      }

      const userIds = Array.from(useriRaw.matchAll(/<@!?(\d+)>/g)).map(m => m[1])

      if (!userIds.length) {
        return NextResponse.json({
          type: 4,
          data: { content: '❌ Nicio mențiune validă găsită.', flags: 64 },
        })
      }

      const results: string[] = []
      for (const discordId of userIds) {
        const user = await prisma.user.findUnique({ where: { discordId } })
        if (!user) {
          results.push(`⚠️ <@${discordId}> nu este înregistrat pe site`)
          continue
        }

        await prisma.user.update({
          where: { id: user.id },
          data:  { points: { increment: parseInt(puncte) } },
        })
        await prisma.pointHistory.create({
          data: {
            userId:      user.id,
            moderatorId: user.id,
            amount:      parseInt(puncte),
            reason:      `Jaf procesat — acordat de <@${callerId}>`,
          },
        })
        await notify({
          userId:  user.id,
          type:    'task',
          title:   '💰 Jaf Procesat',
          message: `Ai primit +${puncte} Grove Coins pentru participarea la jaf!`,
        })

        results.push(`✅ <@${discordId}> +${puncte} pts`)
      }

      return NextResponse.json({
        type: 4,
        data: { content: `**Jaf Procesat — Rezultate:**\n${results.join('\n')}` },
      })
    }

    return NextResponse.json({
      type: 4,
      data: { content: '❌ Comandă necunoscută.', flags: 64 },
    })
  }

  return NextResponse.json({ error: 'Tip request necunoscut' }, { status: 400 })
}
