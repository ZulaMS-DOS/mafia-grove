const WebSocket = require('ws')

const TOKEN                    = process.env.DISCORD_BOT_TOKEN
const CHANNEL_ID               = '1446288393737732147'
const REPORT_CHANNEL_ID        = '1528186240833290271'
const KEYWORD                  = 'jaf'
const EMOJI_DEFAULT            = '⏲️'
const EMOJI_RESPONSABIL        = '✅'
const RESPONSABIL_RESURSE_ROLE = '1462444666958909583'

let ws
let heartbeatInterval
let lastSequence    = null
let reconnectDelay  = 5000
let isConnecting    = false

function scheduleReports() {
  setInterval(async () => {
    const now = new Date()
    const h   = now.getHours()
    const m   = now.getMinutes()
    if (h === 8  && m === 0) await sendReport(true)
    if (h === 20 && m === 0) await sendReport(false)
  }, 60 * 1000)
}

async function sendReport(isMorning) {
  try {
    const messagesRes = await fetch(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100`,
      { headers: { 'Authorization': `Bot ${TOKEN}` } }
    )
    const messages = await messagesRes.json()
    if (!Array.isArray(messages)) return

    const unpaidMessages = []
    for (const msg of messages) {
      const content = (msg.content || '').toLowerCase()
      if (!content.includes(KEYWORD)) continue
      const reactions  = msg.reactions || []
      const hasTimer   = reactions.some(r => r.emoji.name === '⏲️')
      if (hasTimer) {
        unpaidMessages.push({
          author:  msg.author.username,
          content: msg.content.slice(0, 80),
        })
      }
    }

    const emoji  = isMorning ? '☀️' : '🌙'
    const period = isMorning ? 'Dimineață' : 'Seară'
    const divider = '━━━━━━━━━━━━━━━━━━━━'

    if (unpaidMessages.length === 0) {
      await sendMessage(
        REPORT_CHANNEL_ID,
        `## ${emoji} Raport ${period} — Evidențe Jafuri\n${divider}\n> ✅ Toți membrii au predat resursele!\n${divider}`
      )
      return
    }

    const lines = unpaidMessages.map(m => `${divider}\n> ⏲️ **${m.author}**\n> ${m.content}`)

    await sendMessage(
      REPORT_CHANNEL_ID,
      `## ${emoji} Raport ${period} — Evidențe Jafuri\n` +
      `${divider}\n` +
      `**${unpaidMessages.length} membri nu au predat resursele:**\n` +
      lines.join('\n') + '\n' +
      `${divider}\n` +
      `<@&955126889171804170> <@&955126890472022066>`
    )
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
    if (res.ok) {
      console.log(`Reaction ${emoji} adaugat`)
    } else {
      const err = await res.json()
      console.error('Eroare reaction:', err)
    }
  } catch (e) {
    console.error('Eroare fetch reaction:', e.message)
  }
}

function connect() {
  if (isConnecting) return
  isConnecting = true

  console.log(`Conectare Gateway (delay: ${reconnectDelay}ms)...`)
  ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json')

  ws.on('open', () => {
    console.log('Gateway conectat')
    isConnecting   = false
    reconnectDelay = 5000 // reset delay la succes
  })

  ws.on('message', async (data) => {
    const payload = JSON.parse(data)
    const { op, t, s, d } = payload

    if (s) lastSequence = s

    if (op === 10) {
      const interval = d.heartbeat_interval
      clearInterval(heartbeatInterval)
      heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
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

    if (op === 7) {
      console.log('Discord cere reconnect')
      safeReconnect(1000)
    }

    if (op === 9) {
      console.log('Sesiune invalida — reconectare lenta')
      safeReconnect(20000)
    }

    if (t === 'READY') {
      console.log(`Bot gata: ${d.user.username}`)
      scheduleReports()
    }

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
  })

  ws.on('close', (code) => {
    console.log(`Gateway inchis: ${code}`)
    clearInterval(heartbeatInterval)
    isConnecting = false
    // Nu reconecta la coduri fatale
    if (code === 4004 || code === 4010 || code === 4011 || code === 4012 || code === 4013 || code === 4014) {
      console.error(`Cod fatal ${code} — nu reconectez`)
      return
    }
    reconnectDelay = Math.min(reconnectDelay * 2, 60000) // exponential backoff max 60s
    safeReconnect(reconnectDelay)
  })

  ws.on('error', (err) => {
    console.error('Gateway eroare:', err.message)
    isConnecting = false
    ws.terminate()
  })
}

function safeReconnect(delay) {
  clearInterval(heartbeatInterval)
  if (ws) {
    try { ws.terminate() } catch {}
  }
  isConnecting = false
  setTimeout(connect, delay)
}

connect()
