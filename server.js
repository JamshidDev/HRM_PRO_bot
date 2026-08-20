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

// Global error catch.
//
// DIQQAT: bu handler hech qachon throw qilmasligi kerak. grammY'da error
// handler'ining o'zi xato bersa long-polling sikli butunlay to'xtaydi, lekin
// process tirik qoladi — PM2 ham qayta ishga tushirmaydi. Natijada bot "tirik
// zombi" bo'lib qoladi: getUpdates chaqirilmaydi, update'lar Telegram'da
// yig'ilib ketadi. Shu sababli butun tana try/catch ichida.
bot.catch((err) => {
    try {
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
            console.error(`❌ Xato update ${ctx?.update?.update_id} da:`, error)
        }

        // ctx.chat yo'q update'larda (inline_query, chat_member, chat_join_request,
        // inline xabardan kelgan callback_query) ctx.reply() SINXRON throw qiladi —
        // .catch() unday xatoni ushlab qolmaydi. Shuning uchun oldin tekshiramiz.
        if (!ctx?.chat) return

        ctx.reply(`
<i>❌ Serverda xatolik yuz berdi...</i>

Adminga xabarni yuboring...
        `, {
            parse_mode: "HTML"
        }).catch(() => {})
    } catch (handlerError) {
        // Bu yerga tushish — polling to'xtashining oldini olish uchun oxirgi to'siq.
        console.error("❌ bot.catch ichida kutilmagan xato:", handlerError)
    }
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

// uncaughtException'dan keyin process holati ishonchsiz. Log qilib chiqamiz —
// PM2 toza holatda qayta ishga tushiradi. Avval faqat log qilinardi va bot
// ishlamay turgan holatda tirik qolib ketardi.
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err)
    process.exit(1)
})

let shuttingDown = false
const shutdown = () => {
    shuttingDown = true
    bot.stop()
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

// Long-polling. Avval webhook o'chiriladi — aks holda getUpdates konflikt beradi.
try {
    await bot.api.deleteWebhook({ drop_pending_updates: true })
    await bot.start({
        drop_pending_updates: true,
        allowed_updates: ALLOWED_UPDATES,
        onStart: (info) => console.log(`🤖 @${info.username} long-polling rejimida ishga tushdi`),
    })

    // bot.start() faqat bot.stop() chaqirilganda tugaydi. Agar biz to'xtatmagan
    // bo'lsak — polling o'zi o'lgan. Tirik zombi bo'lib turgandan ko'ra chiqamiz,
    // PM2 qayta ko'taradi.
    if (!shuttingDown) {
        console.error("❌ Long-polling kutilmaganda to'xtadi — qayta ishga tushish uchun chiqamiz.")
        process.exit(1)
    }
} catch (error) {
    console.error("❌ Bot ishga tushmadi:", error)
    process.exit(1)
}
