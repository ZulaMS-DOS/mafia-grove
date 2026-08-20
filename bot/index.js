const WebSocket = require('ws')

const TOKEN                    = process.env.DISCORD_BOT_TOKEN
const CHANNEL_ID               = '1446288393737732147'
const REPORT_CHANNEL_ID        = '1528186240833290271'
const COMMAND_CHANNEL_ID       = '1539902499022970900'
const KEYWORD                  = 'jaf'
const EMOJI_DEFAULT            = '⏲️'
const EMOJI_RESPONSABIL        = '✅'
const RESPONSABIL_RESURSE_ROLE = '1462444666958909583'
const LIDER_ROLE               = '955126889171804170'
const CO_LIDER_ROLE            = '955126890472022066'

const ROLE_NAMES = {
  '1537286791667916921': '🌽┇ Farmer',
  '1503322791796146237': '🔫┇ Recrut Jaf',
  '955126892984410162':  '⚔️ ┇ Grove Killers'
}

const ALLOWED_ROLE_MAP = {
  '1446844478173348015': ['1537286791667916921'],                    // Responsabil Farm -> Farmer
  '1348974812315258972': ['1503322791796146237', '955126892984410162'] // Responsabil Jafuri -> Recrut Jaf & Grove Killers
}

const INTENTS = 512 | 32768 | 1024

let ws                = null
let heartbeatInterval = null
let lastSequence      = null
let reconnectDelay    = 10000
let isConnecting      = false
let reportScheduled   = false
let reconnectTimeout  = null
let sessionId         = null
let resumeGatewayUrl  = null

async function registerSlashCommands(appId) {
  try {
    const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        {
          name: 'rol',
          description: 'Ofera un rol unui membru din lista permisa',
          options: [
            {
              name: 'user',
              description: 'Membru care primeste rolul',
              type: 6,
              required: true
            }
          ]
        }
      ])
    })
    if (res.ok) {
      console.log('Comanda /rol a fost inregistrata cu succes!')
    }
  } catch (e) {
    console.error('Eroare inregistrare comanda /rol:', e.message)
  }
}

async function respondInteraction(id, token, body) {
  try {
    await fetch(`https://discord.com/api/v10/interactions/${id}/${token}/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (e) {
    console.error('Eroare respondInteraction:', e.message)
  }
}

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

async function giveRole(guildId, userId, roleId) {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      { method: 'PUT', headers: { 'Authorization': `Bot ${TOKEN}` } }
    )
    return res.ok
  } catch (e) {
    console.error('Eroare giveRole:', e.message)
    return false
  }
}

async function addReaction(channelId, messageId, emoji) {
  try {
    const encoded = encodeURIComponent(emoji)
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages/${encoded}/@me`,
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

      if (op === 10) {
        const interval = d.heartbeat_interval
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        heartbeatInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 1, d: lastSequence }))
          }
        }, interval)

        if (tryResume && sessionId && lastSequence) {
          console.log('Incerc RESUME sesiune...')
          ws.send(JSON.stringify({
            op: 6,
            d: { token: TOKEN, session_id: sessionId, seq: lastSequence },
          }))
        } else {
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

      if (op === 7) {
        console.log('Discord cere reconnect — incerc resume')
        isConnecting = false
        safeReconnect(3000, true)
      }

      if (op === 9) {
        const resumable = d === true
        console.log(`Sesiune invalida (resumable: ${resumable})`)
        sessionId = null
        isConnecting = false
        safeReconnect(resumable ? 3000 : 10000, resumable)
      }

      if (op === 11) {}

      if (t === 'RESUMED') {
        console.log('Sesiune reluata cu succes!')
        scheduleReports()
      }

      if (t === 'READY') {
        sessionId        = d.session_id
        resumeGatewayUrl = d.resume_gateway_url
        console.log(`Bot gata: ${d.user.username} (session: ${sessionId})`)
        scheduleReports()
        await registerSlashCommands(d.application?.id || d.user?.id)
      }

      if (t === 'INTERACTION_CREATE') {
        const interactionId = d.id
        const interactionToken = d.token

        // Rulare comanda /rol
        if (d.type === 2 && d.data.name === 'rol') {
          // Verificare canal permis
          if (d.channel_id !== COMMAND_CHANNEL_ID) {
            await respondInteraction(interactionId, interactionToken, {
              type: 4,
              data: { content: `❌ Această comandă poate fi folosită doar în canalul <#${COMMAND_CHANNEL_ID}>!`, flags: 64 }
            })
            return
          }

          const targetUserId = d.data.options?.[0]?.value
          const executorRoles = d.member?.roles || []

          const allowedRoleIds = new Set()
          for (const roleId of executorRoles) {
            const allowed = ALLOWED_ROLE_MAP[roleId] || []
            allowed.forEach(r => allowedRoleIds.add(r))
          }

          if (allowedRoleIds.size === 0) {
            await respondInteraction(interactionId, interactionToken, {
              type: 4,
              data: { content: '❌ Nu ai permisiunea să folosești această comandă!', flags: 64 }
            })
            return
          }

          const selectOptions = Array.from(allowedRoleIds).map(roleId => ({
            label: ROLE_NAMES[roleId] || `Rol ${roleId}`,
            value: roleId
          }))

          await respondInteraction(interactionId, interactionToken, {
            type: 4,
            data: {
              content: `Alege rolul pe care dorești să i-l oferi lui <@${targetUserId}>:`,
              flags: 64,
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 3,
                      custom_id: `select_role:${targetUserId}`,
                      placeholder: 'Alege un rol din listă...',
                      options: selectOptions
                    }
                  ]
                }
              ]
            }
          })
        }

        // Selectare rol din lista drop-down
        if (d.type === 3 && d.data.custom_id.startsWith('select_role:')) {
          if (d.channel_id !== COMMAND_CHANNEL_ID) {
            await respondInteraction(interactionId, interactionToken, {
              type: 4,
              data: { content: `❌ Această acțiune poate fi făcută doar în canalul <#${COMMAND_CHANNEL_ID}>!`, flags: 64 }
            })
            return
          }

          const targetUserId = d.data.custom_id.split(':')[1]
          const roleIdToAdd = d.data.values[0]
          const guildId = d.guild_id

          const ok = await giveRole(guildId, targetUserId, roleIdToAdd)

          if (ok) {
            await respondInteraction(interactionId, interactionToken, {
              type: 7,
              data: {
                content: `✅ Rolul <@&${roleIdToAdd}> a fost oferit cu succes lui <@${targetUserId}>!`,
                components: []
              }
            })
          } else {
            await respondInteraction(interactionId, interactionToken, {
              type: 7,
              data: {
                content: '❌ Eroare la adăugarea rolului.',
                components: []
              }
            })
          }
        }
      }

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

      if (t === 'MESSAGE_CREATE') {
        const channelId   = d.channel_id
        const rawContent  = d.content || ''
        const content     = rawContent.toLowerCase()
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
