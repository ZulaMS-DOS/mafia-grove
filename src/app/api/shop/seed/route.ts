import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

export async function GET() {
  const { session, error } = await requireLeadership()
  if (error) return error

  const products = [
    { name: '$20.000.000',           description: 'Bani cash pentru organizatie',                    imageUrl: null, price: 160, stock: 5  },
    { name: '20x Injectii Adrenalina', description: 'Pachet cu 20 de injectii cu adrenalina',         imageUrl: null, price: 50,  stock: 3  },
    { name: '25x Armura',            description: 'Pachet cu 25 de bucati de armura',                 imageUrl: null, price: 60,  stock: 8  },
    { name: 'Vamos',                 description: 'Declasse Vamos — masina de organizatie',           imageUrl: null, price: 500, stock: 1  },
    { name: 'Vapid Raptor 19',       description: 'Vapid Raptor 19 — masina de organizatie',           imageUrl: null, price: 500, stock: 1  },
    { name: 'Rebel',                 description: 'Karin Rebel — masina de organizatie',               imageUrl: null, price: 300, stock: 1  },
    { name: 'Remove FW 1/3',         description: 'Elimina un Faction Warn de nivel 1',                imageUrl: null, price: 80,  stock: -1 },
    { name: 'Remove FW 2/3',         description: 'Elimina un Faction Warn de nivel 2',                imageUrl: null, price: 140, stock: -1 },
    { name: 'Remove FW 3/3',         description: 'Elimina un Faction Warn de nivel 3',                imageUrl: null, price: 200, stock: -1 },
    { name: 'Taxa 40%',              description: 'Reducere 40% la taxa sindicat',                     imageUrl: null, price: 80,  stock: 3  },
    { name: 'Taxa Libera',           description: 'Scutire completă de la taxa sindicat',               imageUrl: null, price: 100, stock: 3  },
    { name: 'Cerere ajutor la taxa', description: 'Cerere de ajutor pentru plata taxei sindicat',       imageUrl: null, price: 50,  stock: 1  },
    { name: 'Imunitate Activitate',  description: 'Imunitate temporară pentru cerintele de activitate', imageUrl: null, price: 50,  stock: 10 },
  ]

  let created = 0
  for (const p of products) {
    await (prisma as any).shopItem.create({
      data: { ...p, createdBy: session!.user.id },
    })
    created++
  }

  return NextResponse.json({ success: true, created })
}
