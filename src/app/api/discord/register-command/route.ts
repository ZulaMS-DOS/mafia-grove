import { NextResponse } from 'next/server'
import { requireLeadership } from '@/lib/middleware'

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const DISCORD_GUILD_ID  = process.env.DISCORD_GUILD_ID!

export async function GET() {
  const { error } = await requireLeadership()
  if (error) return error

  const command = {
    name:        'jaf-procesat',
    description: 'Acordă puncte membrilor pentru un jaf procesat',
    options: [
      {
        type:        4,
        name:        'puncte',
        description: 'Câte puncte acorzi',
        required:    true,
      },
      {
        type:        3,
        name:        'useri',
        description: 'Menționează userii (ex: @user1 @user2)',
        required:    true,
      },
    ],
  }

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
    return NextResponse.json({ error: 'Eroare Discord', details: data }, { status: 500 })
  }

  return NextResponse.json({ success: true, command: data })
}
