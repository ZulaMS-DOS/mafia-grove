const WebSocket = require('ws')

const TOKEN                    = process.env.DISCORD_BOT_TOKEN
const CHANNEL_ID               = '1446288393737732147'
const KEYWORD                  = 'jaf'
const EMOJI_DEFAULT            = '⏲️'
const EMOJI_RESPONSABIL        = '✅'
const RESPONSABIL_RESURSE_ROLE = '1462444666958909583'

let ws
let heartbeatInterval
let lastSequence = null

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

connect()
