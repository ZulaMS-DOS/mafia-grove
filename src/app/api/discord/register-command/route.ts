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
            { name: 'Vinewood (1.5 pts)',  value: 'vinewood'    },
            { name: 'Alta (1.5 pts)',      value: 'alta'        },
            { name: 'Desert (1.5 pts)',    value: 'desert'      },
            { name: 'Highway (1.5 pts)',   value: 'highway'     },
            { name: 'Pacific (2 pts)',     value: 'pacific'     },
            { name: 'Blaine (2 pts)',      value: 'blaine'      },
            { name: 'Biju (2 pts)',        value: 'biju'        },
            { name: 'ATM (1.5 pts)',       value: 'atm'         },
            { name: 'Magazin (1 pt)',      value: 'magazin'     },
            { name: 'Digital Den (2 pts)', value: 'digital_den' },
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
    {
      name:        'taxa',
      description: 'Marchează taxa achitată pentru un membru',
      options: [
        {
          type:        6, // USER
          name:        'user',
          description: 'Menționează membrul',
          required:    true,
        },
        {
          type:        3, // STRING
          name:        'grad',
          description: 'Gradul pentru care se marchează taxa',
          required:    true,
          choices: [
            { name: 'Lider',        value: '955126889171804170'  },
            { name: 'Co-Lider',     value: '955126890472022066'  },
            { name: 'Tester',       value: '1462444900388704317' },
            { name: 'Membru',       value: '1501319885488390184' },
            { name: 'Grove Killer', value: '955126892984410162'  },
            { name: 'Muncitor',     value: '1342912254542348298' },
          ],
        },
      ],
    }, // <-- Virgula lipsă a fost adăugată aici
    {
      name:        'grad',
      description: 'Oferă un grad unui membru',
      options: [
        {
          type:        6,
          name:        'user',
          description: 'Menționează membrul',
          required:    true,
        },
        {
          type:        3,
          name:        'grad',
          description: 'Gradul de acordat',
          required:    true,
          choices: [
            { name: '🌽 Farmer',       value: '1537286791667916921' },
            { name: '🔫 Recrut Jaf',   value: '1503322791796146237' },
            { name: '⚔️ Grove Killer', value: '955126892984410162'  },
          ],
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
