export const DISCORD_GUILD_ID    = process.env.DISCORD_GUILD_ID!
export const DISCORD_BOT_TOKEN   = process.env.DISCORD_BOT_TOKEN!
export const LEADERSHIP_ROLE_IDS = (process.env.DISCORD_LEADERSHIP_ROLES || '').split(',').map(s => s.trim())

// Permanent site owner. This Discord account always has the highest site access.
export const SITE_OWNER_DISCORD_ID = '949760812518617138'

/** Verifică dacă userul e pe server și returnează membrul */
export async function getGuildMember(discordId: string) {
  const res = await fetch(
    `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${discordId}`,
    { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }, next: { revalidate: 0 } }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Discord API error: ' + res.status)
  return res.json()
}

/** Returnează toate rolurile serverului */
export async function getGuildRoles() {
  const res = await fetch(
    `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/roles`,
    { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }, next: { revalidate: 60 } }
  )
  if (!res.ok) return []
  return res.json()
}

/** Verifică dacă un array de role IDs conține un rol de leadership */
export function isLeadership(roleIds: string[]): boolean {
  return roleIds.some(id => LEADERSHIP_ROLE_IDS.includes(id) || id === SITE_OWNER_DISCORD_ID)
}

/** Construiește URL-ul avatarului Discord */
export function discordAvatar(userId: string, hash: string | null) {
  if (!hash) return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`
  return `https://cdn.discordapp.com/avatars/${userId}/${hash}.png?size=128`
}

export const LEADERSHIP_ROLE_ID   = '1107100643291828224'
export const CO_LIDER_ROLE_ID     = '1107099637644529684'
export const TESTER_ROLE_ID       = '1107098741510520852'
export const MUNCITOR_ROLE_ID     = '1107093171026010203'
export const MEMBRU_ROLE_ID       = '1107095888045801532'
export const GROVE_KILLER_ROLE_ID = '1518710460717731840'

export function isFullLeadership(roleIds: string[]): boolean {
  return roleIds.some(id => LEADERSHIP_ROLE_IDS.includes(id) || id === SITE_OWNER_DISCORD_ID)
}

export function isTester(roleIds: string[]): boolean {
  return roleIds.includes(TESTER_ROLE_ID)
}

export function canGiveFines(roleIds: string[]): boolean {
  return isFullLeadership(roleIds) || isTester(roleIds)
}

export function canManageRequests(roleIds: string[]): boolean {
  return isFullLeadership(roleIds) || isTester(roleIds)
}

/** Verifica daca userul are cel putin rolul minim (Muncitor sau mai sus) */
export function hasMinimumAccess(roleIds: string[]): boolean {
  const validRoles = [
    MUNCITOR_ROLE_ID,
    MEMBRU_ROLE_ID,
    GROVE_KILLER_ROLE_ID,
    TESTER_ROLE_ID,
    CO_LIDER_ROLE_ID,
    LEADERSHIP_ROLE_IDS,
    SITE_OWNER_DISCORD_ID,
  ]
  return roleIds.some(id => validRoles.includes(id))
}
