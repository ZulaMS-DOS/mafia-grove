const WebSocket = require('ws')

const TOKEN                    = process.env.DISCORD_BOT_TOKEN
const CHANNEL_ID               = '1446288393737732147'
const REPORT_CHANNEL_ID        = '1528186240833290271'
const KEYWORD                  = 'jaf'
const EMOJI_DEFAULT            = '⏲️'
const EMOJI_RESPONSABIL        = '✅'
const RESPONSABIL_RESURSE_ROLE = '1462444666958909583'

let ws               = null
let heartbeatInterval = null
let lastSequence      = null
let reconnectDelay    = 10000  // incepe cu 10 secunde
let isConnecting      = false
let reportScheduled   = false
let reconnectTimeout  = null

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

    const emoji   = isMorning ? '☀️' : '🌙'
    const period  = isMorning ? 'Dimineață' : 'Seară'
    const divider = '━━━━━━━━━━━━━━━━━━━━'
    const pingRole = `<@&${RESPONSABIL_RESURSE_ROLE}>`

    let content
    if (unpaidUsers.size === 0) {
      content =
        `## ${emoji} Raport ${period} — Evidențe Jafuri\n` +
        `${divider}\n> ✅ Toți membrii au predat resursele!\n` +
        `${divider}\n${pingRole}`
    } else {
      const lines = Array.from(unpaidUsers.values()).map(u => `> ⏲️ **${u}**`)
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
  const actualDelay = Math.min(delay, 300000) // max 5 minute
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
    reconnectDelay = 10000 // reset la succes
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

        ws.send(JSON.stringify({
          op: 2,
          d: {
            token:      TOKEN,
            intents:    33280,
            properties: { os: 'linux', browser: 'grove-bot', device: 'grove-bot' },
          },
        }))
      }

      // RECONNECT
      if (op === 7) {
        console.log('Discord cere reconnect')
        isConnecting = false
        safeReconnect(5000)
      }

      // INVALID SESSION — asteapta mai mult
      if (op === 9) {
        console.log('Sesiune invalida')
        isConnecting = false
        safeReconnect(30000)
      }

      // READY
      if (t === 'READY') {
        console.log(`Bot gata: ${d.user.username}`)
        scheduleReports()
      }
// MESSAGE_REACTION_ADD — detecteaza cand se pune o reactie
      if (t === 'MESSAGE_REACTION_ADD') {
        const channelId   = d.channel_id
        const messageId   = d.message_id
        const emojiName   = d.emoji?.name
        const reactorRoles = d.member?.roles || []

        const isAuthorized = reactorRoles.includes('955126889171804170') || // Lider
                             reactorRoles.includes('955126890472022066') || // Co-Lider
                             reactorRoles.includes('1462444666958909583')   // Responsabil Resurse

        if (channelId === CHANNEL_ID && emojiName === '✅' && isAuthorized) {
          // Sterge reactia cu ceasul de pe mesaj
          try {
            const encoded = encodeURIComponent('⏲️')
            await fetch(
              `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`,
              { method: 'DELETE', headers: { 'Authorization': `Bot ${TOKEN}` } }
            )
            console.log(`Reaction ⏲️ scoasa de pe mesajul ${messageId}`)
          } catch (e) {
            console.error('Eroare stergere reaction:', e)
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

  ws.on('close', (code, reason) => {
    clearTimeout(connectTimeout)
    console.log(`Gateway inchis: ${code}`)
    isConnecting = false

    // Coduri fatale — nu reconecta
    const fatalCodes = [4004, 4010, 4011, 4012, 4013, 4014]
    if (fatalCodes.includes(code)) {
      console.error(`Cod fatal ${code} — opresc botul`)
      process.exit(1) // Railway va reporni containerul dupa un delay
      return
    }

    reconnectDelay = Math.min(reconnectDelay * 2, 300000) // max 5 minute
    safeReconnect(reconnectDelay)
  })

  ws.on('error', (err) => {
    console.error('Gateway eroare:', err.message)
    isConnecting = false
    safeReconnect(reconnectDelay)
  })
}

// Start
connect()
