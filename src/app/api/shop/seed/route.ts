import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

export async function GET() {
  const { session, error } = await requireLeadership()
  if (error) return error

  const products = [
    {
      name:        '$20.000.000',
      description: 'Bani cash pentru organizatie',
      imageUrl:    'https://www.pngmart.com/files/13/Money-Stack-PNG-Transparent-Image.png',
      price:       160,
      stock:       5,
    },
    {
      name:        '20x Injectii Adrenalina',
      description: 'Pachet cu 20 de injectii cu adrenalina',
      imageUrl:    null,
      price:       50,
      stock:       3,
    },
    {
      name:        '25x Armura',
      description: 'Pachet cu 25 de bucati de armura',
      imageUrl:    null,
      price:       60,
      stock:       8,
    },
    {
      name:        'Vamos',
      description: 'Declasse Vamos — masina de organizatie',
      imageUrl:    'https://www.gtabase.com/img/gta5/vehicles/declasse-vamos/declasse-vamos-1.jpg',
      price:       500,
      stock:       1,
    },
    {
      name:        'Vapid Raptor 19',
      description: 'Vapid Raptor 19 — masina de organizatie',
      imageUrl:    'https://www.gtabase.com/img/gta5/vehicles/vapid-caracara-4x4/vapid-caracara-4x4-1.jpg',
      price:       500,
      stock:       1,
    },
    {
      name:        'Rebel',
      description: 'Karin Rebel — masina de organizatie',
      imageUrl:    'https://www.gtabase.com/img/gta5/vehicles/karin-rebel/karin-rebel-1.jpg',
      price:       300,
      stock:       1,
    },
    {
      name:            'Remove FW 1/3',
      description:     'Scade Faction Warn-ul curent cu 1 nivel',
      imageUrl:        null,
      price:           80,
      stock:           -1,
      requirementType: 'fw_remove_1',
    },
    {
      name:            'Remove FW 2/3',
      description:     'Scade Faction Warn-ul curent cu 2 niveluri',
      imageUrl:        null,
      price:           140,
      stock:           -1,
      requirementType: 'fw_remove_2',
    },
    {
      name:            'Remove FW 3/3',
      description:     'Șterge complet Faction Warn-ul curent',
      imageUrl:        null,
      price:           200,
      stock:           -1,
      requirementType: 'fw_remove_3',
    },
    {
      name:        'Taxa 40%',
      description: 'Reducere 40% la taxa sindicat',
      imageUrl:    null,
      price:       80,
      stock:       3,
    },
    {
      name:            'Taxa Libera',
      description:     'Scutire completă de la taxa sindicat săptămâna aceasta',
      imageUrl:        null,
      price:           100,
      stock:           3,
      requirementType: 'taxa_neplatita',
    },
    {
      name:        'Cerere ajutor la taxa',
      description: 'Cerere de ajutor pentru plata taxei sindicat',
      imageUrl:    null,
      price:       50,
      stock:       1,
    },
    {
      name:        'Imunitate Activitate',
      description: 'Imunitate temporară pentru cerintele de activitate',
      imageUrl:    null,
      price:       50,
      stock:       10,
    },
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
