const mineflayer = require('mineflayer')

// -------------------------
// CONFIG
// -------------------------
const SERVER_HOST = 'play.rivalsnetwork.hu'
const SERVER_PORT = 25565

// Accounts list
const ACCOUNTS = [
  {
    username: "KiflisKrumpli",
    password: "grodika55",
    mode: "timed"   // disconnects at 12:10 AM only
  },
  {
    username: "PingvinRC1",
    password: "grodika55",
    mode: "timed"   // disconnects at 12:10 AM only
  },
  {
    username: "KittyDestroyer",
    password: "grodika55",
    mode: "afk"     // disconnects at 12:10 AM, 12:10 PM, and 5:10 AM
  }
]

// -------------------------

// Track scheduled disconnects per bot
const scheduledDisconnects = new Map()

// Calculate milliseconds until next target time
function msUntilTime(targetHour, targetMinute) {
  const now = new Date()
  const target = new Date()
  target.setHours(targetHour, targetMinute, 0, 0)
  
  // If target time has passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1)
  }
  
  return target - now
}

// Schedule reconnects based on mode
function scheduleReconnects(account, bot) {
  if (account.mode === "timed") {
    // Only reconnect at 12:10 AM
    const msUntil = msUntilTime(0, 10) // 12:10 AM
    console.log(`[${account.username}] Next reconnect scheduled in ${Math.round(msUntil / 60000)} minutes (12:10 AM)`)
    
    const timeoutId = setTimeout(() => {
      console.log(`[${account.username}] Scheduled disconnect at 12:10 AM`)
      scheduledDisconnects.set(account.username, true)
      bot.quit()
    }, msUntil)
  }
  
  if (account.mode === "afk") {
    // Reconnect at 12:10 AM, 5:10 AM, and 12:10 PM
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Find next reconnect time
    let nextHour, nextMinute
    
    if (currentHour < 5 || (currentHour === 5 && currentMinute < 10)) {
      // Next is 5:10 AM
      nextHour = 5
      nextMinute = 10
    } else if (currentHour < 12 || (currentHour === 12 && currentMinute < 10)) {
      // Next is 12:10 PM
      nextHour = 12
      nextMinute = 10
    } else {
      // Next is 12:10 AM (midnight)
      nextHour = 0
      nextMinute = 10
    }
    
    const msUntil = msUntilTime(nextHour, nextMinute)
    const timeStr = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`
    console.log(`[${account.username}] Next reconnect scheduled in ${Math.round(msUntil / 60000)} minutes (${timeStr})`)
    
    const timeoutId = setTimeout(() => {
      console.log(`[${account.username}] Scheduled disconnect at ${timeStr}`)
      scheduledDisconnects.set(account.username, true)
      bot.quit()
    }, msUntil)
  }
}

function startBot(account) {
  console.log(`\n[${account.username}] Starting bot...`)

  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline',
    version: "1.20.1"
  })

  bot.once('spawn', () => {
    console.log(`[${account.username}] Spawned, logging in...`)
    bot.chat(`/login ${account.password}`)

    // Schedule reconnects for both modes
    scheduleReconnects(account, bot)

    if (account.mode === "afk") {
      setTimeout(() => {
        console.log(`[${account.username}] Running /joinq earthsmp`)
        bot.chat('/joinq earthsmp')
      }, 3000) // slight delay to ensure login completes
    }
  })

  // Reconnect handler
  bot.on('end', () => {
    console.log(`[${account.username}] Disconnected.`)
    
    // Check if this was a scheduled disconnect
    if (scheduledDisconnects.get(account.username)) {
      scheduledDisconnects.delete(account.username)
      console.log(`[${account.username}] Reconnecting in 5 seconds...`)
      setTimeout(() => startBot(account), 5000)
    } else {
      // Unexpected disconnect - reconnect immediately for both modes
      console.log(`[${account.username}] Unexpected disconnect. Reconnecting in 5 seconds...`)
      setTimeout(() => startBot(account), 5000)
    }
  })

  bot.on('error', err => {
    console.log(`[${account.username}] ERROR: ${err}`)
  })

  bot.on('kicked', (reason) => {
    console.log(`[${account.username}] Kicked: ${reason}`)
  })
}

// Start all bots
for (const acc of ACCOUNTS) {
  startBot(acc)
}


