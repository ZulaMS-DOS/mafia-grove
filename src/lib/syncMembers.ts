import { prisma } from '@/lib/prisma'

const DISCORD_GUILD_ID  = process.env.DISCORD_GUILD_ID!
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!
const MUNCITOR_ROLE_ID  = '1107093171026010203'
const MEMBRU_ROLE_ID    = '1107095888045801532'
const NOTIFY_CHANNEL_ID = '1542818782979031070'
const DIVIDER           = '━━━━━━━━━━━━━━━━━━━━'

async function fetchAllDiscordMembers() {
  const allMembers: any[] = []
  let after = '0'
  while (true) {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members?limit=1000&after=${after}`,
      { headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` } }
    )
    if (!res.ok) throw new Error(`Discord API error: ${res.status}`)
    const batch = await res.json()
    if (!batch.length) break
    allMembers.push(...batch)
    after = batch[batch.length - 1].user.id
    if (batch.length < 1000) break
  }
  return allMembers
}

async function saveLog(categorie: string, titlu: string, continut: string) { /* unchanged */ }

// BUILD FIX: Discord mentions must be strings
const __BUILD_FIX__ = '<@&1107100643291828224> <@&1515017621127299303> <@&1107099637644529684>'
