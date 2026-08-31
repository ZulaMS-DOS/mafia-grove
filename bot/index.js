const WebSocket = require('ws')

const TOKEN                    = process.env.DISCORD_BOT_TOKEN
const CHANNEL_ID               = '1512519244888408114'
const REPORT_CHANNEL_ID        = '1542818932426022922'
const KEYWORD                  = 'jaf'
const EMOJI_DEFAULT            = '⏲️'
const EMOJI_RESPONSABIL        = '✅'
const RESPONSABIL_RESURSE_ROLE = '1543345807959527524'
const LIDER_ROLE               = '1107100643291828224'
const CO_LIDER_ROLE            = '1515017621127299303'
const MUNCITOR_ROLE_ID         = '1107093171026010203'

// Intents: GUILD_MESSAGES(512) + MESSAGE_CONTENT(32768) + GUILD_MESSAGE_REACTIONS(1024) = 34304
const INTENTS = 512 | 32768 | 1024 | 2

let ws                = null
let heartbeatInterval = null
let lastSequence      = null
let reconnectDelay    = 10000
let isConnecting      = false
let reportScheduled   = false
let reconnectTimeout  = null
let sessionId         = null
let resumeGatewayUrl  = null

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
      const hasTimer  = reactions.some(r => r.emoji.name === EMOJI_DEFAULT)
      if (hasTimer) unpaidUsers.set(msg.author.id, msg.author.username)
    }

    const emoji    = isMorning ? '☀️' : '🌙'
    const period   = isMorning ? 'Dimineață' : 'Seară'
    const divider  = '━━━━━━━━━━━━━━━━━━━━'
    const pingRole = `<@&${RESPONSABIL_RESURSE_ROLE}>`

    let content
    if (unpaidUsers.size === 0) {
      content = `## ${emoji} Raport ${period} — Evidențe Jafuri\n${divider}\n> ✅ Toți membrii au predat resursele!\n${divider}\n${pingRole}`
    } else {
      const lines = Array.from(unpaidUsers.entries()).map(([id, username]) => `> ⏲️ <@${id}> **(${username})**`)
      content =
        `## ${emoji} Raport ${period} — Evidențe Jafuri\n${divider}\n` +
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
      console.error('Eroare removeReaction status:', res.status, err)
    }
  } catch (e) {
    console.error('Eroare removeReaction:', e.message)
  }
}

async function addRole(guildId, userId, roleId) {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${TOKEN}`
        }
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('Add role error:', err)
    }
  } catch (e) {
    console.error('Add role exception:', e.message)
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

function safeReconnect(delay, canResume = false) {
  if (isConnecting) return
  cleanup()
  const actualDelay = Math.min(delay, 300000)
  console.log(`Reconectare in ${actualDelay / 1000}s... (resume: ${canResume})`)
  reconnectTimeout = setTimeout(() => connect(canResume), actualDelay)
}

function connect(tryResume = false) {
  if (isConnecting || ws) return
  isConnecting = true

  const gatewayUrl = (tryResume && resumeGatewayUrl)
    ? `${resumeGatewayUrl}?v=10&encoding=json`
    : 'wss://gateway.discord.gg/?v=10&encoding=json'

  console.log(`Conectare Gateway... (resume: ${tryResume})`)

  try {
    ws = new WebSocket(gatewayUrl)
  } catch (e) {
    console.error('Eroare creare WebSocket:', e.message)
    isConnecting = false
    safeReconnect(reconnectDelay)
    return
  }

  const connectTimeout = setTimeout(() => {
    console.log('Timeout conectare')
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

      // HELLO
      if (op === 10) {
        const interval = d.heartbeat_interval
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        heartbeatInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 1, d: lastSequence }))
          }
        }, interval)

        // Incearca RESUME daca avem sesiune valida
        if (tryResume && sessionId && lastSequence) {
          console.log('Incerc RESUME sesiune...')
          ws.send(JSON.stringify({
            op: 6,
            d: { token: TOKEN, session_id: sessionId, seq: lastSequence },
          }))
        } else {
          // IDENTIFY normal
          ws.send(JSON.stringify({
            op: 2,
            d: {
              token:      TOKEN,
              intents:    INTENTS,
              properties: { os: 'linux', browser: 'grove-bot', device: 'grove-bot' },
            },
          }))
        }
      }

      // RECONNECT — Discord cere reconnect cu resume
      if (op === 7) {
        console.log('Discord cere reconnect — incerc resume')
        isConnecting = false
        safeReconnect(3000, true)
      }

      // INVALID SESSION
      if (op === 9) {
        const resumable = d === true
        console.log(`Sesiune invalida (resumable: ${resumable})`)
        sessionId = null
        isConnecting = false
        safeReconnect(resumable ? 3000 : 10000, resumable)
      }

      // HEARTBEAT ACK
      if (op === 11) {}

      // RESUMED
      if (t === 'RESUMED') {
        console.log('Sesiune reluata cu succes!')
        scheduleReports()
      }

      // READY
      if (t === 'READY') {
        sessionId        = d.session_id
        resumeGatewayUrl = d.resume_gateway_url
        console.log(`Bot gata: ${d.user.username} (session: ${sessionId})`)
        scheduleReports()
      }

      // MESSAGE_REACTION_ADD
      if (t === 'MESSAGE_REACTION_ADD') {
        console.log('Reactie detectata:', d.emoji?.name, 'canal:', d.channel_id)
        const channelId = d.channel_id
        const messageId = d.message_id
        const emojiName = d.emoji?.name

        if (channelId === CHANNEL_ID && emojiName === EMOJI_RESPONSABIL) {
          try {
            let roles = d.member?.roles

            if (!roles && d.guild_id && d.user_id) {
              const memberRes = await fetch(
                `https://discord.com/api/v10/guilds/${d.guild_id}/members/${d.user_id}`,
                { headers: { 'Authorization': `Bot ${TOKEN}` } }
              )
              const member = await memberRes.json()
              roles = member.roles || []
            }

            roles = roles || []
            const isAuthorized = roles.includes(LIDER_ROLE) ||
                                 roles.includes(CO_LIDER_ROLE) ||
                                 roles.includes(RESPONSABIL_RESURSE_ROLE)

            if (isAuthorized) {
              await removeReaction(channelId, messageId, EMOJI_DEFAULT)
            }
          } catch (e) {
            console.error('Eroare la procesarea reactiei:', e.message)
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

    // Coduri care permit resume
    const resumeCodes = [4000, 4001, 4002, 4003, 4005, 4008, 4009, 1001, 1006]
    const canResume   = resumeCodes.includes(code) && !!sessionId

    reconnectDelay = Math.min(reconnectDelay * 2, 300000)
    safeReconnect(reconnectDelay, canResume)
  })

  ws.on('error', (err) => {
    console.error('Gateway eroare:', err.message)
    isConnecting = false
    safeReconnect(reconnectDelay, false)
  })
}

connect()
