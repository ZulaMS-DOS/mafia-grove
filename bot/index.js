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
let lastSequence = null

// ── Raport zilnic ──────────────────────────────────────────
function scheduleReports() {
  setInterval(async () => {
    const now = new Date()
    const h   = now.getHours()
    const m   = now.getMinutes()

    if ((h === 8 && m === 0) || (h === 20 && m === 0)) {
      const isMorning = h === 8
      await sendReport(isMorning)
    }
  }, 60 * 1000) // verifica la fiecare minut
}

async function sendReport(isMorning) {
  try {
    // Aduna toate mesajele din canalul de evidenta
    const messagesRes = await fetch(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100`,
      { headers: { 'Authorization': `Bot ${TOKEN}` } }
    )
    const messages = await messagesRes.json()
    if (!Array.isArray(messages)) return

    // Filtreaza mesajele care au emoji ⏲️ (nu au dat resursele inca)
    const unpaidMessages = []

    for (const msg of messages) {
      const content = (msg.content || '').toLowerCase()
      if (!content.includes(KEYWORD)) continue

      // Verifica daca are reactia ⏲️
      const reactions = msg.reactions || []
      const hasTimer  = reactions.some(r =>
        r.emoji.name === '⏲️' || r.emoji.name === '⌛' || r.emoji.name === '⏳'
      )

      if (hasTimer) {
        unpaidMessages.push({
          author:  msg.author.username,
          content: msg.content.slice(0, 80),
          id:      msg.id,
        })
      }
    }

    const emoji  = isMorning ? '☀️' : '🌙'
    const period = isMorning ? 'Dimineață' : 'Seară'

    if (unpaidMessages.length === 0) {
      await sendMessage(
        REPORT_CHANNEL_ID,
        `## ${emoji} Raport ${period} — Evidențe Jafuri\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `> ✅ Toți membrii au predat resursele!\n` +
        `━━━━━━━━━━━━━━━━━━━━`
      )
      return
    }

    const lines = unpaidMessages.map(m =>
      `> ⏲️ **${m.author}** — ${m.content}`
    )

    await sendMessage(
      REPORT_CHANNEL_ID,
      `## ${emoji} Raport ${period} — Evidențe Jafuri\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `**${unpaidMessages.length} membri nu au predat resursele:**\n` +
      lines.join('\n') + '\n' +
      `━━━━━━━━━━━━━━━━━━━━\n` +
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
      {
        method:  'PUT',
        headers: { 'Authorization': `Bot ${TOKEN}` },
      }
    )
    if (res.ok) {
      console.log(`Reaction ${emoji} adaugat la mesajul ${messageId}`)
    } else {
      const err = await res.json()
      console.error('Eroare reaction:', err)
    }
  } catch (e) {
    console.error('Eroare fetch reaction:', e.message)
  }
}

// ── Gateway ─────────────────────────────────────────────────
function connect() {
  ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json')

  ws.on('open', () => console.log('Gateway conectat'))

  ws.on('message', async (data) => {
    const payload = JSON.parse(data)
    const { op, t, s, d } = payload

    if (s) lastSequence = s

    if (op === 10) {
      const interval = d.heartbeat_interval
      heartbeatInterval = setInterval(() => {
        ws.send(JSON.stringify({ op: 1, d: lastSequence }))
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

    if (op === 7) reconnect()
    if (op === 9) setTimeout(connect, 5000)

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
    if (code !== 1000) setTimeout(reconnect, 5000)
  })

  ws.on('error', (err) => {
    console.error('Gateway eroare:', err.message)
    ws.close()
  })
}

function reconnect() {
  clearInterval(heartbeatInterval)
  if (ws) ws.terminate()
  setTimeout(connect, 3000)
}

connect()
