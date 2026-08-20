import { Api, GrammyError, HttpError } from "grammy"
import dotenv from "dotenv"

// server.js'dagi dotenv.config() bu moduldan KEYIN ishlaydi (import'lar
// hoisting bo'ladi), shuning uchun env'ni o'zimiz yuklaymiz — aks holda
// --env-file ishlatilmagan holatda logger sozlamalarini ko'rmay qoladi.
dotenv.config({ quiet: true })

// ─── Logger bot orqali xatolarni guruh topic'iga yuborish ───
//
// Alohida Bot instance kerak emas: polling ham webhook ham shart emas, faqat
// sendMessage. Shu sababli yengil `Api` ishlatiladi — asosiy botning
// long-polling siklidan mustaqil.
//
// ASOSIY QOIDA: bu modul HECH QACHON throw qilmasligi kerak. Logger o'zi xato
// bersa botni yiqitib qo'yishi mumkin, ya'ni xato haqida xabar berish
// mexanizmi xatoning o'zi manbasiga aylanadi.

const TOKEN = process.env.LOGGER_BOT_TOKEN
const CHAT_ID = process.env.LOG_CHAT_ID
const THREAD_ID = process.env.LOG_THREAD_ID
const ENV_NAME = process.env.LOG_ENV || "unknown"
const DEDUP_WINDOW_MS = Number(process.env.LOG_DEDUP_WINDOW_MS) || 5 * 60 * 1000
const MAX_PER_MIN = Number(process.env.LOG_MAX_PER_MIN) || 20
const CONSOLE_CAPTURE = (process.env.LOG_CONSOLE_ERRORS || "true") !== "false"

// console.error perexvat qilinganda ham loggerning o'z chiqishi rekursiyaga
// tushmasligi uchun original havola modul yuklanishida saqlanadi.
const rawError = console.error.bind(console)
const rawWarn = console.warn.bind(console)

const enabled = Boolean(TOKEN && CHAT_ID)
// LOG_API_ROOT — faqat test uchun: xabarlar Telegram o'rniga lokal serverga
// yuboriladi (formatlashni real token'siz tekshirish uchun).
const api = enabled
    ? new Api(TOKEN, process.env.LOG_API_ROOT ? { apiRoot: process.env.LOG_API_ROOT } : undefined)
    : null

if (!enabled) {
    rawWarn(
        "⚠️  Logger o'chirilgan: LOGGER_BOT_TOKEN yoki LOG_CHAT_ID yo'q. " +
        "Xatolar faqat konsolga chiqadi."
    )
} else if (!THREAD_ID) {
    rawWarn("⚠️  LOG_THREAD_ID yo'q — xabarlar topic'ga emas, guruhning umumiy oqimiga tushadi.")
}

const MAX_MESSAGE_LEN = 4000
const MAX_STACK_LEN = 1200
const MAX_BODY_LEN = 800
const MAX_DEDUP_ENTRIES = 500

// ─── Yordamchilar ───

// Tokenlar xato matniga (axios config, grammY payload) tushib qolishi mumkin.
const SECRETS = [TOKEN, process.env.BOT_TOKEN].filter(Boolean)

const redact = (text) => {
    let out = String(text ?? "")
    for (const secret of SECRETS) out = out.split(secret).join("***")
    return out
}

// escapeHTML utils/helper.js'da bor, lekin u undefined uchun undefined qaytaradi
// va trim qiladi — bu yerda har doim string kerak, shuning uchun o'ralgan holda.
const esc = (value) =>
    redact(value)
        .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

const cut = (text, limit) => {
    const str = String(text ?? "")
    return str.length > limit ? str.slice(0, limit) + "\n…(kesildi)" : str
}

const safeJson = (value, limit = MAX_BODY_LEN) => {
    try {
        if (value === undefined || value === null) return null
        if (typeof value === "string") return cut(value, limit)
        return cut(JSON.stringify(value), limit)
    } catch {
        return null
    }
}

const now = () => new Date()

const formatTime = (date) => {
    try {
        const p = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Tashkent",
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false,
        }).formatToParts(date).reduce((acc, x) => ({ ...acc, [x.type]: x.value }), {})
        return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}:${p.second}`
    } catch {
        return date.toISOString()
    }
}

// ─── Xato turini aniqlash ───

const describeError = (err) => {
    try {
        if (err instanceof GrammyError) {
            return {
                type: `GrammyError (${err.error_code})`,
                code: err.error_code,
                message: err.description,
                stack: err.stack,
                details: { method: err.method, payload: safeJson(err.payload) },
            }
        }
        if (err instanceof HttpError) {
            return {
                type: "HttpError (Telegram'ga ulanib bo'lmadi)",
                code: err.error?.code,
                message: err.message,
                stack: err.stack,
                details: null,
            }
        }
        if (err?.isAxiosError) {
            const status = err.response?.status
            return {
                type: `AxiosError${status ? ` (${status})` : ""}`,
                code: status || err.code,
                message: err.message,
                stack: err.stack,
                details: {
                    request: `${(err.config?.method || "?").toUpperCase()} ${err.config?.url || "?"}`,
                    code: err.code,
                    body: safeJson(err.response?.data),
                },
            }
        }
        if (err instanceof Error) {
            return {
                type: err.name || "Error",
                code: err.code,
                message: err.message,
                stack: err.stack,
                details: null,
            }
        }
        return {
            type: typeof err,
            code: undefined,
            message: safeJson(err, 500) || String(err),
            stack: undefined,
            details: null,
        }
    } catch {
        return { type: "Unknown", code: undefined, message: "xato tavsiflanmadi", stack: undefined, details: null }
    }
}

// ─── Deduplikatsiya ───

// Xabardagi ID/UUID/raqamlar olib tashlanadi: turli userlarda chiqqan bir xil
// xato bitta fingerprint bo'lishi kerak.
const normalize = (text) =>
    String(text ?? "")
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "#uuid")
        .replace(/\d{3,}/g, "#")

const firstFrame = (stack) => {
    const line = String(stack ?? "").split("\n").find((l) => l.trim().startsWith("at "))
    return normalize(line?.trim() || "")
}

const fingerprintOf = (scope, info) =>
    [scope, info.type, info.code ?? "", normalize(info.message), firstFrame(info.stack)].join("|")

const seen = new Map()

// Fingerprint yangi yoki oyna tugagan bo'lsa yuborish kerak. Oyna ichidagi
// takrorlar faqat sanaladi va keyingi xabar oxirida ko'rsatiladi.
const shouldSend = (fingerprint) => {
    const at = Date.now()
    const entry = seen.get(fingerprint)

    if (!entry) {
        seen.set(fingerprint, { count: 1, lastSentAt: at })
        pruneSeen()
        return { send: true, repeat: 0 }
    }

    entry.count += 1
    if (at - entry.lastSentAt < DEDUP_WINDOW_MS) return { send: false, repeat: entry.count }

    const repeat = entry.count
    entry.count = 1
    entry.lastSentAt = at
    return { send: true, repeat }
}

const pruneSeen = () => {
    if (seen.size <= MAX_DEDUP_ENTRIES) return
    const oldest = [...seen.entries()]
        .sort((a, b) => a[1].lastSentAt - b[1].lastSentAt)
        .slice(0, seen.size - MAX_DEDUP_ENTRIES)
    for (const [key] of oldest) seen.delete(key)
}

// ─── Rate limit ───
//
// Telegram guruhga ~20 xabar/daqiqa ruxsat beradi. Limitdan oshgan xabarlar
// tashlanadi va oyna bo'shashi bilan bitta xulosa yuboriladi.

const sentAt = []
let suppressed = 0
let summaryTimer = null

const scheduleSummary = () => {
    if (summaryTimer) return
    const wait = sentAt.length ? Math.max(1000, 60_000 - (Date.now() - sentAt[0])) : 60_000
    summaryTimer = setTimeout(() => {
        summaryTimer = null
        const n = suppressed
        suppressed = 0
        if (n > 0) dispatch(`⏳ <b>${n}</b> ta xabar rate limit tufayli tashlandi · ${esc(ENV_NAME)}`)
    }, wait)
    summaryTimer.unref?.()
}

const pending = new Set()
const reported = new WeakSet()

const dispatch = (text) => {
    if (!enabled) return
    try {
        const at = Date.now()
        while (sentAt.length && at - sentAt[0] > 60_000) sentAt.shift()

        if (sentAt.length >= MAX_PER_MIN) {
            suppressed += 1
            scheduleSummary()
            return
        }
        sentAt.push(at)

        const p = api
            .sendMessage(CHAT_ID, cut(text, MAX_MESSAGE_LEN), {
                parse_mode: "HTML",
                ...(THREAD_ID ? { message_thread_id: Number(THREAD_ID) } : {}),
                link_preview_options: { is_disabled: true },
            })
            .catch((e) => {
                // Bu yerda console.error ishlatilmaydi — perexvat yoqilgan bo'lsa
                // logger o'z xatosini o'ziga yuborib cheksiz sikl yasaydi.
                rawWarn("⚠️  Logger xabari yuborilmadi:", e?.description || e?.message || e)
            })

        pending.add(p)
        p.finally(() => pending.delete(p))
    } catch (e) {
        rawWarn("⚠️  Logger dispatch xatosi:", e?.message || e)
    }
}

// ─── Kontekst (grammY ctx) ───

const describeCtx = (ctx) => {
    if (!ctx) return []
    const lines = []
    try {
        const from = ctx.from
        if (from) {
            const name = [from.first_name, from.last_name].filter(Boolean).join(" ")
            const username = from.username ? ` · @${from.username}` : ""
            lines.push(`👤 User: ${esc(name || "—")}${esc(username)} · <code>${esc(from.id)}</code>`)
        }
        const chatId = ctx.chat?.id
        const updateId = ctx.update?.update_id
        if (chatId || updateId) {
            lines.push(`💬 Chat: <code>${esc(chatId ?? "—")}</code> · update <code>${esc(updateId ?? "—")}</code>`)
        }

        const cb = ctx.update?.callback_query?.data
        const text = ctx.message?.text
        if (cb) lines.push(`🎯 Amal: callback "${esc(cut(cb, 100))}"`)
        else if (text) lines.push(`🎯 Amal: "${esc(cut(text, 100))}"`)
    } catch {
        // kontekst o'qib bo'lmasa xabarning qolgani baribir ketishi kerak
    }
    return lines
}

// ─── Xabar matni ───

const buildText = (info, { scope, ctx, extra, repeat }) => {
    const lines = [
        `🔴 <b>XATO</b> · ${esc(ENV_NAME)}`,
        `🕒 ${esc(formatTime(now()))}`,
        `📍 Joy: <code>${esc(scope || "unknown")}</code>`,
        `🧩 Turi: ${esc(info.type)}`,
        ...describeCtx(ctx),
    ]

    const details = { ...(info.details || {}), ...(extra || {}) }
    for (const [key, value] of Object.entries(details)) {
        if (value === undefined || value === null || value === "") continue
        lines.push(`▪️ ${esc(key)}: <code>${esc(cut(value, 500))}</code>`)
    }

    lines.push("", `❗ ${esc(cut(info.message || "xabar yo'q", 600))}`)

    if (info.stack) {
        lines.push(`<pre>${esc(cut(info.stack, MAX_STACK_LEN))}</pre>`)
    }
    if (repeat > 1) {
        const minutes = Math.round(DEDUP_WINDOW_MS / 60000)
        lines.push(`🔁 oxirgi ${minutes} daqiqada ${repeat} marta`)
    }

    return lines.join("\n")
}

// ─── Ommaviy API ───

/**
 * Xatoni logger botga yuboradi. Fire-and-forget — await qilish shart emas va
 * chaqiruvchi oqimni sekinlashtirmaydi.
 * meta: { scope, ctx, extra }
 */
export const reportError = (err, meta = {}) => {
    if (!enabled) return
    try {
        // Tuple pattern'da xato null bo'lishi mumkin (backend 200 qaytardi, lekin
        // javob shakli kutilganidan boshqa) — bu ham xabar berishga arziydi.
        if (err === null || err === undefined) {
            err = new Error("javob kutilmagan formatda (xato obyekti yo'q)")
        }

        // Bitta xato obyekti ikki marta yuborilmasin: logError() bilan aniq
        // scope'da yuborilgan xato keyin console.error perexvatiga tushsa
        // takroriy xabar bo'lib ketardi.
        if (err && typeof err === "object") {
            if (reported.has(err)) return
            reported.add(err)
        }

        const info = describeError(err)
        const { send, repeat } = shouldSend(fingerprintOf(meta.scope || "unknown", info))
        if (!send) return
        dispatch(buildText(info, { ...meta, repeat }))
    } catch (e) {
        rawWarn("⚠️  reportError ishlamadi:", e?.message || e)
    }
}

/** Hodisa xabari (start/stop kabi) — dedup qilinmaydi. */
export const reportEvent = (text) => {
    if (!enabled) return
    dispatch(`${esc(text)}\n🕒 ${esc(formatTime(now()))} · ${esc(ENV_NAME)}`)
}

/** Konsolga chiqaradi VA logger botga yuboradi. */
export const logError = (scope, err, meta = {}) => {
    rawError(`❌ [${scope}]`, err)
    reportError(err, { ...meta, scope })
}

/**
 * Kutilayotgan xabarlarni yuborib bo'lishini kutadi (max timeoutMs).
 * process.exit()'dan oldin chaqirilishi kerak — aks holda oxirgi, eng muhim
 * xabar yuborilmasdan process o'ladi.
 */
export const flushAndClose = async (timeoutMs = 3000) => {
    if (!enabled || pending.size === 0) return
    try {
        await Promise.race([
            Promise.allSettled([...pending]),
            new Promise((resolve) => setTimeout(resolve, timeoutMs)),
        ])
    } catch {
        // jim: exit'ni kechiktirmaymiz
    }
}

/**
 * console.error'ni o'rab oladi: original chiqish saqlanadi, ustiga logger
 * botga yuborish qo'shiladi. Shu bilan kodning har qanday joyidagi
 * console.error avtomatik topic'ga tushadi.
 */
export const initConsoleCapture = () => {
    if (!enabled || !CONSOLE_CAPTURE) return
    if (console.error.__loggerWrapped) return

    const wrapped = (...args) => {
        rawError(...args)
        try {
            const err = args.find((a) => a instanceof Error)
            const message = args
                .filter((a) => a !== err)
                .map((a) => (typeof a === "string" ? a : safeJson(a, 300)))
                .filter(Boolean)
                .join(" ")

            if (err) reportError(err, { scope: "console.error", extra: { izoh: message } })
            else if (message) reportError(new Error(message), { scope: "console.error" })
        } catch {
            // jim
        }
    }
    wrapped.__loggerWrapped = true
    console.error = wrapped
}

export const isLoggerEnabled = () => enabled
