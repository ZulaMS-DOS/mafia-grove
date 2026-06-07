import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/webhooks/points
// Header: Authorization: Bearer WEBHOOK_SECRET
// Body: { discordId, amount, reason, moderatorDiscordId? }
//
// Apelezi din Discord bot:
//   fetch('https://site-tau.railway.app/api/webhooks/points', {
//     method: 'POST',
//     headers: { 'Authorization': 'Bearer SECRET_TAU', 'Content-Type': 'application/json' },
//     body: JSON.stringify({ discordId: '123...', amount: 100, reason: 'Activitate buna' })
//   })

export async function POST(req: NextRequest) {
  // 1. Verificare secret
  const auth   = req.headers.get('authorization')
  const secret = process.env.WEBHOOK_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'WEBHOOK_SECRET nu e setat pe server' }, { status: 500 })
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized — secret gresit' }, { status: 401 })
  }

  // 2. Validare date
  const body = await req.json().catch(() => ({}))
  const { discordId, amount, reason, moderatorDiscordId } = body

  if (!discordId || !amount || !reason) {
    return NextResponse.json({
      error: 'Lipsesc campuri: discordId, amount, reason sunt obligatorii'
    }, { status: 400 })
  }

  const pts = parseInt(amount)
  if (isNaN(pts) || pts === 0) {
    return NextResponse.json({ error: 'amount trebuie sa fie un numar diferit de 0' }, { status: 400 })
  }

  // 3. Gaseste userul tinta
  const user = await prisma.user.findUnique({ where: { discordId } })
  if (!user) {
    return NextResponse.json({
      error: `Userul cu Discord ID ${discordId} nu a fost gasit. Trebuie sa fi logat macar odata pe site.`
    }, { status: 404 })
  }

  // 4. Gaseste moderatorul (optional)
  let moderatorId = user.id // default: self
  if (moderatorDiscordId) {
    const mod = await prisma.user.findUnique({ where: { discordId: moderatorDiscordId } })
    if (mod) moderatorId = mod.id
  }

  // 5. Actualizeaza punctele + istoricul
  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data:  { points: { increment: pts } },
    }),
    prisma.pointHistory.create({
      data: {
        userId:      user.id,
        moderatorId: moderatorId,
        amount:      pts,
        reason:      `[Webhook] ${reason}`,
      },
    }),
  ])

  return NextResponse.json({
    success:  true,
    message:  `${pts > 0 ? '+' : ''}${pts} puncte acordate lui ${user.username}`,
    user: {
      username:   updatedUser.username,
      discordId:  updatedUser.discordId,
      points:     updatedUser.points,
    },
  })
}
