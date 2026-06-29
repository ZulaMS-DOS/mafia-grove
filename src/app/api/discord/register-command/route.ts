import { NextResponse } from 'next/server'
import { requireLeadership } from '@/lib/middleware'

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const DISCORD_GUILD_ID  = process.env.DISCORD_GUILD_ID!

export async function GET() {
  const { error } = await requireLeadership()
  if (error) return error

  const commands = [
    {
      name:        'jaf-procesat',
      description: 'Acordă puncte fixe pentru un jaf procesat',
      options: [
        {
          type:        3,
          name:        'tip-jaf',
          description: 'Tipul jafului procesat',
          required:    true,
          choices: [
            { name: 'Vinewood (1.5 pts)',    value: 'vinewood'    },
            { name: 'Alta (1.5 pts)',         value: 'alta'        },
            { name: 'Desert (1.5 pts)',       value: 'desert'      },
            { name: 'Highway (1.5 pts)',      value: 'highway'     },
            { name: 'Pacific (2 pts)',        value: 'pacific'     },
            { name: 'Blaine (2 pts)',         value: 'blaine'      },
            { name: 'Biju (2 pts)',           value: 'biju'        },
            { name: 'Magazin (1.5 pts)',      value: 'magazin'     },
            { name: 'Digital Den (1.5 pts)',  value: 'digital_den' },
          ],
        },
        {
          type:        3,
          name:        'useri',
          description: 'Menționează userii (ex: @user1 @user2)',
          required:    true,
        },
      ],
    },
    {
      name:        'taxa24h',
      description: 'Acordă 10 puncte fixe pentru Taxa 24 Ore',
      options: [
        {
          type:        3,
          name:        'useri',
          description: 'Menționează userii (ex: @user1 @user2)',
          required:    true,
        },
      ],
    },
    {
      name:        'activitate',
      description: 'Acordă puncte manuale pentru activitate',
      options: [
        {
          type:        10,
          name:        'puncte',
          description: 'Câte puncte acorzi (accepta zecimale, ex: 2.5)',
          required:    true,
        },
        {
          type:        3,
          name:        'useri',
          description: 'Menționează userii (ex: @user1 @user2)',
          required:    true,
        },
      ],
    },
  ]

  const results = []
  for (const command of commands) {
    const res = await fetch(
      `https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/guilds/${DISCORD_GUILD_ID}/commands`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(command),
      }
    )
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: 'Eroare Discord', command: command.name, details: data }, { status: 500 })
    }
    results.push(data)
  }

  return NextResponse.json({ success: true, commands: results })
}
