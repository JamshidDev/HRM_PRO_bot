import { Bot } from "grammy"
import dotenv from "dotenv"

import { configComposer, clientComposer, broadcastComposer } from "./composer/index.js"
import { stopAllWorkers } from "./workers/workerOne.js"
import "./config/mongodbConfig.js"

dotenv.config({ quiet: true })

const TOKEN = process.env.BOT_TOKEN

const bot = new Bot(TOKEN)

bot.use(configComposer)
bot.use(clientComposer)
bot.use(broadcastComposer)

// Global error catch
bot.catch((err) => {
    const ctx = err.ctx
    console.error(`Xato update ${ctx.update.update_id} da:`, err.error)
    ctx.reply(`
<i>❌ Serverda xatolik yuz berdi...</i>

Adminga xabarni yuboring...
    `, {
        parse_mode: "HTML"
    }).catch(() => {})
})

const ALLOWED_UPDATES = [
    "my_chat_member",
    "chat_member",
    "message",
    "callback_query",
    "inline_query",
    "chat_join_request",
]

// Process-darajali handlerlar bot.start()'dan OLDIN ro'yxatga olinadi:
// bot.start() long-polling siklida bloklaydi, shuning uchun undan keyin
// qo'yilsa polling rejimida hech qachon ro'yxatga olinmaydi.
process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled Rejection:", reason)
})

process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err)
})

process.on("SIGINT", async () => {
    await stopAllWorkers()
    process.exit(0)
})

process.on("SIGTERM", async () => {
    await stopAllWorkers()
    process.exit(0)
})

// Long-polling. Avval webhook o'chiriladi — aks holda getUpdates konflikt beradi.
await bot.api.deleteWebhook({ drop_pending_updates: true })
await bot.start({
    drop_pending_updates: true,
    allowed_updates: ALLOWED_UPDATES,
    onStart: (info) => console.log(`🤖 @${info.username} long-polling rejimida ishga tushdi`),
})
