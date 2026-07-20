import { Bot, GrammyError, HttpError } from "grammy"
import dotenv from "dotenv"

import { configComposer, clientComposer } from "./composer/index.js"

dotenv.config({ quiet: true })

const TOKEN = process.env.BOT_TOKEN

const bot = new Bot(TOKEN)

bot.use(configComposer)
bot.use(clientComposer)

// Telegram tomonidan qaytadigan, foydalanuvchiga aloqasi yo'q xatolar. Bularda
// "Serverda xatolik" ko'rsatish noto'g'ri — amal allaqachon bajarilgan yoki keraksiz.
const IGNORABLE = [
    "message is not modified",       // bir xil sahifa tugmasi qayta bosildi
    "message to delete not found",   // "Kuting..." allaqachon o'chirilgan
    "message can't be deleted",      // 48 soatdan eski
    "query is too old",              // callback muddati tugagan
    "message to edit not found",
]

const isIgnorable = (error) =>
    error instanceof GrammyError &&
    IGNORABLE.some((m) => error.description?.toLowerCase().includes(m))

// Global error catch
bot.catch((err) => {
    const ctx = err.ctx
    const error = err.error

    if (isIgnorable(error)) {
        console.warn(`⚠️  E'tiborsiz Telegram xatosi: ${error.description}`)
        return
    }

    if (error instanceof HttpError) {
        console.error("❌ Telegram'ga ulanib bo'lmadi:", error)
    } else if (error instanceof GrammyError) {
        console.error(`❌ Telegram API xatosi (${error.error_code}):`, error.description)
    } else {
        console.error(`❌ Xato update ${ctx.update.update_id} da:`, error)
    }

    ctx.reply(`
<i>❌ Serverda xatolik yuz berdi...</i>

Adminga xabarni yuboring...
    `, {
        parse_mode: "HTML"
    }).catch(() => {})
})

// Faqat handler'i bor update turlari.
const ALLOWED_UPDATES = [
    "my_chat_member",
    "message",
    "callback_query",
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

process.on("SIGINT", () => bot.stop())
process.on("SIGTERM", () => bot.stop())

// Long-polling. Avval webhook o'chiriladi — aks holda getUpdates konflikt beradi.
await bot.api.deleteWebhook({ drop_pending_updates: true })
await bot.start({
    drop_pending_updates: true,
    allowed_updates: ALLOWED_UPDATES,
    onStart: (info) => console.log(`🤖 @${info.username} long-polling rejimida ishga tushdi`),
})
