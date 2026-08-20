import { Bot, GrammyError, HttpError } from "grammy"
import dotenv from "dotenv"

import { configComposer, clientComposer } from "./composer/index.js"
import { flushAndClose, initConsoleCapture, logError, reportEvent } from "./utils/logger.js"

dotenv.config({ quiet: true })

const TOKEN = process.env.BOT_TOKEN
const ENV_NAME = process.env.LOG_ENV || "unknown"

// console.error'ni logger botga ulaymiz — kodning har qanday joyidagi
// console.error avtomatik guruh topic'iga tushadi. bot.use()'lardan oldin
// chaqirilishi kerak, aks holda middleware'lar ichidagi chiqishlar o'tib ketadi.
initConsoleCapture()

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

        // E'tiborsiz xatolar logger botga YUBORILMAYDI: ular normal holat va
        // guruhni bir necha daqiqada spamlab tashlardi.
        if (isIgnorable(error)) {
            console.warn(`⚠️  E'tiborsiz Telegram xatosi: ${error.description}`)
            return
        }

        if (error instanceof HttpError) {
            logError("bot.catch · Telegram'ga ulanib bo'lmadi", error, { ctx })
        } else if (error instanceof GrammyError) {
            logError("bot.catch · Telegram API xatosi", error, { ctx })
        } else {
            logError("bot.catch", error, { ctx })
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
        logError("bot.catch ichida kutilmagan xato", handlerError)
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
    logError("unhandledRejection", reason)
})

// uncaughtException'dan keyin process holati ishonchsiz. Log qilib chiqamiz —
// PM2 toza holatda qayta ishga tushiradi. Avval faqat log qilinardi va bot
// ishlamay turgan holatda tirik qolib ketardi.
process.on("uncaughtException", async (err) => {
    logError("uncaughtException", err)
    // exit'dan oldin xabar Telegram'ga yetib olishi kerak — aks holda eng
    // muhim xato (crash sababi) hech qayerda qolmaydi.
    await flushAndClose(3000)
    process.exit(1)
})

let shuttingDown = false
const shutdown = async () => {
    shuttingDown = true
    reportEvent("🟡 Bot to'xtatildi (SIGINT/SIGTERM)")
    bot.stop()
    await flushAndClose(2000)
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

// Long-polling. Avval webhook o'chiriladi — aks holda getUpdates konflikt beradi.
try {
    await bot.api.deleteWebhook({ drop_pending_updates: true })
    await bot.start({
        drop_pending_updates: true,
        allowed_updates: ALLOWED_UPDATES,
        onStart: (info) => {
            console.log(`🤖 @${info.username} long-polling rejimida ishga tushdi`)
            reportEvent(`🟢 Bot ishga tushdi · @${info.username}`)
        },
    })

    // bot.start() faqat bot.stop() chaqirilganda tugaydi. Agar biz to'xtatmagan
    // bo'lsak — polling o'zi o'lgan. Tirik zombi bo'lib turgandan ko'ra chiqamiz,
    // PM2 qayta ko'taradi.
    if (!shuttingDown) {
        // console.warn: console.error perexvat qilinadi, quyidagi reportEvent bilan ikkilanib ketmasligi uchun.
        console.warn("❌ Long-polling kutilmaganda to'xtadi — qayta ishga tushish uchun chiqamiz.")
        reportEvent("🔴 Long-polling kutilmaganda to'xtadi — process qayta ishga tushadi")
        await flushAndClose(3000)
        process.exit(1)
    }
} catch (error) {
    logError("bot.start · Bot ishga tushmadi", error, { extra: { muhit: ENV_NAME } })
    await flushAndClose(3000)
    process.exit(1)
}
