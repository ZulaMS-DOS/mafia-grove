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

async function saveLog(categorie: string, titlu: string, continut: string) {
  try {
    await (prisma as any).botLog.create({ data: { categorie, titlu, continut } })
  } catch {}
}

async function deleteOldMessages() { /* unchanged */ }
async function sendDiscordMessage(content: string) { /* unchanged */ }
async function addRole(discordId: string, roleId: string) { /* unchanged */ }
async function removeRole(discordId: string, roleId: string) { /* unchanged */ }
function getWeekStart() { /* unchanged */ return new Date() }
async function hasPaidTaxa(userId: string): Promise<boolean> { return true }

export async function syncDiscordMembers() {
const reminderMsg =
  `## ⚠️ Muncitori — Perioadă de Probă Expiră Mâine!\n` +
  `${DIVIDER}\n` +
  lines.join('\n') + '\n' +
  `${DIVIDER}\n` +
  `<@&1107100643291828224> <@&1515017621127299303> <@&1107099637644529684>`
}
