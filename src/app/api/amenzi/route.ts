import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireFineGiver } from '@/lib/middleware'
import { notify } from '@/lib/notifications'

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

  const { userId, tip, material, bucati, termen, fwLevel } = await req.json()
  if (!userId || !material) {
    return NextResponse.json({ error: 'Membru și material obligatorii' }, { status: 400 })
  }

  const tipFinal = tip === 'fw' ? 'fw' : 'amenda'

  const fine = await (prisma as any).fine.create({
    data: {
      userId,
      tip:         tipFinal,
      material,
      bucati:      parseInt(bucati) || 0,
      termen:      termen?.trim()   || '',
      fwLevel:     fwLevel ? parseInt(fwLevel) : null,
      givenBy:     session!.user.id,
      givenByName: session!.user.name,
    },
  })

  if (tipFinal === 'fw') {
    await notify({
      userId,
      type:    'fine',
      title:   '🚨 Ai primit un Faction Warn',
      message: `FW ${fwLevel}/3 — Motiv: ${material} — de la ${session!.user.name}`,
    })
  } else {
    const fwText = fwLevel ? ` + Faction Warn ${fwLevel}/3` : ''
    await notify({
      userId,
      type:    'fine',
      title:   '⚠️ Ai primit o amendă',
      message: `${material}${bucati ? ` (${bucati} buc)` : ''}${termen ? ` · Termen: ${termen}` : ''}${fwText} — de la ${session!.user.name}`,
    })
  }

  return NextResponse.json({ fine })
}
