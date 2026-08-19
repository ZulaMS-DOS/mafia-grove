const WebSocket = require('ws')

const TOKEN                    = process.env.DISCORD_BOT_TOKEN
const CHANNEL_ID               = '1446288393737732147'
const REPORT_CHANNEL_ID        = '1528186240833290271'
const KEYWORD                  = 'jaf'
const EMOJI_DEFAULT            = '⏲️'
const EMOJI_RESPONSABIL        = '✅'
const RESPONSABIL_RESURSE_ROLE = '1462444666958909583'

const LIDER_ROLE     = '955126889171804170'
const CO_LIDER_ROLE  = '955126890472022066'

let ws               = null
let heartbeatInterval = null
let lastSequence      = null
let reconnectDelay    = 10000
let isConnecting      = false
let reportScheduled   = false
let reconnectTimeout  = null

// Intents:
// 512   = GUILD_MESSAGES
// 32768 = MESSAGE_CONTENT
// 8192  = GUILD_MESSAGE_REACTIONS
// Total = 41472
const INTENTS = 512 | 32768 | 8192

function scheduleReports() {
  if (reportScheduled) return
  reportScheduled = true
  console.log('Rapoarte programate la 08:00 si 20:00')

  setInterval(async () => {
    const now = new Date()
    const h   = now.getHours()
    const m   = now.getMinutes()
    if (h === 8  && m === 0) await sendReport(true)
    if (h === 20 && m === 0) await sendReport(false)
  }, 60 * 1000)
}

async function deleteOldBotMessages() {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${REPORT_CHANNEL_ID}/messages?limit=20`,
      { headers: { 'Authorization': `Bot ${TOKEN}` } }
    )
    const messages = await res.json()
    if (!Array.isArray(messages)) return

    for (const msg of messages) {
      if (msg.author?.bot) {
        await fetch(
          `https://discord.com/api/v10/channels/${REPORT_CHANNEL_ID}/messages/${msg.id}`,
          { method: 'DELETE', headers: { 'Authorization': `Bot ${TOKEN}` } }
        )
        await new Promise(r => setTimeout(r, 600))
      }
    }
  } catch (e) {
    console.error('Eroare stergere mesaje:', e.message)
  }
}

async function sendReport(isMorning) {
  try {
    const messagesRes = await fetch(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100`,
      { headers: { 'Authorization': `Bot ${TOKEN}` } }
    )
    const messages = await messagesRes.json()
    if (!Array.isArray(messages)) return

    const unpaidUsers = new Map()
    for (const msg of messages) {
      const content = (msg.content || '').toLowerCase()
      if (!content.includes(KEYWORD)) continue
      const reactions = msg.reactions || []
      const hasTimer  = reactions.some(r => r.emoji.name === '⏲️')
      if (hasTimer) {
        unpaidUsers.set(msg.author.id, msg.author.username)
      }
    }

    const emoji    = isMorning ? '☀️' : '🌙'
    const period   = isMorning ? 'Dimineață' : 'Seară'
    const divider  = '━━━━━━━━━━━━━━━━━━━━'
    const pingRole = `<@&${RESPONSABIL_RESURSE_ROLE}>`

    let content
    if (unpaidUsers.size === 0) {
      content =
        `## ${emoji} Raport ${period} — Evidențe Jafuri\n` +
        `${divider}\n> ✅ Toți membrii au predat resursele!\n` +
        `${divider}\n${pingRole}`
    } else {
    const lines = Array.from(unpaidUsers.entries()).map(([id, username]) => `> ⏲️ <@${id}> **(${username})**`)

      content =
        `## ${emoji} Raport ${period} — Evidențe Jafuri\n` +
        `${divider}\n` +
        `**${unpaidUsers.size} membri nu au predat resursele:**\n` +
        lines.join('\n') + '\n' +
        `${divider}\n${pingRole}`
    }

    await deleteOldBotMessages()
    await sendMessage(REPORT_CHANNEL_ID, content)
  } catch (e) {
    console.error('Eroare raport:', e.message)
  }
}

async function sendMessage(channelId, content) {
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method:  'POST',
      headers: { 'Authorization': `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content }),
    })
  } catch (e) {
    console.error('Eroare sendMessage:', e.message)
  }
}

async function addReaction(channelId, messageId, emoji) {
  try {
    const encoded = encodeURIComponent(emoji)
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`,
      { method: 'PUT', headers: { 'Authorization': `Bot ${TOKEN}` } }
    )
    if (!res.ok) {
      const err = await res.json()
      console.error('Eroare reaction:', err)
    }
  } catch (e) {
    console.error('Eroare fetch reaction:', e.message)
  }
}

async function removeReaction(channelId, messageId, emoji) {
  try {
    const encoded = encodeURIComponent(emoji)
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`,
      { method: 'DELETE', headers: { 'Authorization': `Bot ${TOKEN}` } }
    )
    if (res.ok) {
      console.log(`Reaction ${emoji} scoasa de pe mesajul ${messageId}`)
    } else {
      const err = await res.json()
      console.error('Eroare stergere reaction:', err)
    }
  } catch (e) {
    console.error('Eroare fetch removeReaction:', e.message)
  }
}

function cleanup() {
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null }
  if (reconnectTimeout)  { clearTimeout(reconnectTimeout);   reconnectTimeout  = null }
  if (ws) {
    try { ws.removeAllListeners(); ws.terminate() } catch {}
    ws = null
  }
}

function safeReconnect(delay) {
  if (isConnecting) return
  cleanup()
  const actualDelay = Math.min(delay, 300000)
  console.log(`Reconectare in ${actualDelay / 1000}s...`)
  reconnectTimeout = setTimeout(connect, actualDelay)
}

function connect() {
  if (isConnecting || ws) return
  isConnecting = true
  console.log('Conectare Gateway...')

  try {
    ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json')
  } catch (e) {
    console.error('Eroare creare WebSocket:', e.message)
    isConnecting = false
    safeReconnect(reconnectDelay)
    return
  }

  const connectTimeout = setTimeout(() => {
    console.log('Timeout conectare — reconectez')
    isConnecting = false
    safeReconnect(reconnectDelay)
  }, 30000)

  ws.on('open', () => {
    clearTimeout(connectTimeout)
    console.log('Gateway conectat')
    isConnecting   = false
    reconnectDelay = 10000
  })

  ws.on('message', async (data) => {
    try {
      const payload = JSON.parse(data)
      const { op, t, s, d } = payload

      if (s) lastSequence = s

      if (op === 10) {
        const interval = d.heartbeat_interval
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        heartbeatInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 1, d: lastSequence }))
          }
        }, interval)

        ws.send(JSON.stringify({
          op: 2,
          d: {
            token:      TOKEN,
            intents:    INTENTS,
            properties: { os: 'linux', browser: 'grove-bot', device: 'grove-bot' },
          },
        }))
      }

         if (op === 7) {
      console.log('Discord cere reconnect')
      isConnecting = false
      safeReconnect(30000)
    }
      
      if (op === 9) {
        console.log('Sesiune invalida')
        isConnecting = false
        safeReconnect(30000)
      }

      if (t === 'READY') {
        console.log(`Bot gata: ${d.user.username}`)
        scheduleReports()
      }

      // MESSAGE_REACTION_ADD
      if (t === 'MESSAGE_REACTION_ADD') {
        console.log('Reactie detectata:', d.emoji?.name, 'pe canal:', d.channel_id)
        const channelId    = d.channel_id
        const messageId    = d.message_id
        const emojiName    = d.emoji?.name

        if (channelId === CHANNEL_ID && emojiName === '✅') {
          // Fetch member roles din Discord API
          try {
            const memberRes = await fetch(
              `https://discord.com/api/v10/guilds/${d.guild_id}/members/${d.user_id}`,
              { headers: { 'Authorization': `Bot ${TOKEN}` } }
            )
            const member = await memberRes.json()
            const roles  = member.roles || []

            const isAuthorized = roles.includes(LIDER_ROLE) ||
                                 roles.includes(CO_LIDER_ROLE) ||
                                 roles.includes(RESPONSABIL_RESURSE_ROLE)

            if (isAuthorized) {
              await removeReaction(channelId, messageId, '⏲️')
            }
          } catch (e) {
            console.error('Eroare fetch member:', e.message)
          }
        }
      }

      // MESSAGE_CREATE
      if (t === 'MESSAGE_CREATE') {
        const channelId   = d.channel_id
        const content     = (d.content || '').toLowerCase()
        const messageId   = d.id
        const authorRoles = d.member ? d.member.roles || [] : []

        if (channelId === CHANNEL_ID && content.includes(KEYWORD)) {
          const isResponsabil = authorRoles.includes(RESPONSABIL_RESURSE_ROLE)
          const emoji = isResponsabil ? EMOJI_RESPONSABIL : EMOJI_DEFAULT
          await addReaction(channelId, messageId, emoji)
        }
      }

    } catch (e) {
      console.error('Eroare procesare mesaj:', e.message)
    }
  })

  ws.on('close', (code) => {
    clearTimeout(connectTimeout)
    console.log(`Gateway inchis: ${code}`)
    isConnecting = false

    const fatalCodes = [4004, 4010, 4011, 4012, 4013, 4014]
    if (fatalCodes.includes(code)) {
      console.error(`Cod fatal ${code} — opresc botul`)
      process.exit(1)
      return
    }

    reconnectDelay = Math.min(reconnectDelay * 2, 300000)
    safeReconnect(reconnectDelay)
  })

  ws.on('error', (err) => {
    console.error('Gateway eroare:', err.message)
    isConnecting = false
    safeReconnect(reconnectDelay)
  })
}

connect()
