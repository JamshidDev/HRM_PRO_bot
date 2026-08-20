import {Composer} from "grammy"
import {authService} from "../service/service/index.js"
import {hears}  from "@grammyjs/i18n"
import {getMarkdownMsg, escapeHTML, deleteLoader,
    getPaginationKeyboard, getPaginationEventKeyboard,getMarkdownMsgEvent, getPaginationMedKeyboard, getMarkdownMsgMed} from "../utils/helper.js"
import Keyboards from "../keyboards/index.js"
import {issueOtp} from "../utils/otp.js"
import {logError} from "../utils/logger.js"

const bot = new Composer().chatType('private')



bot.command('start', async (ctx) => {
    const payload = ctx.match?.trim()

    // Deep link maqsadlari:
    //   /start web | mobile | web-<token> | mobile-<token>  → tizimga kirish kodi
    //   /start reset | reset-<token>                         → parolni tiklash kodi
    //
    // Token QISMI IXTIYORIY: web hozir `?start=web` ko'rinishida (token'siz)
    // link berayapti. Avval bu yerda defis majburiy edi va shu sababli link
    // avtomatik kod bermay, oddiy menyuni ochib qo'yardi.
    //
    // Backend `get-otp` faqat chat_id qabul qiladi, ya'ni <token> backendga
    // uzatilmaydi — payload'dan bizga faqat "qaysi maqsadda kod so'ralyapti"
    // degan signal kerak (kod matni shunga qarab o'zgaradi).
    // Telegram deep-link payload: ≤64 belgi, faqat A-Za-z0-9_- ruxsat etiladi.
    const intentOf = (value) => {
        if (/^reset(-[A-Za-z0-9_-]{1,58})?$/.test(value)) return 'reset'
        if (/^(web|mobile)(-[A-Za-z0-9_-]{1,57})?$/.test(value)) return 'otp'
        return null
    }

    const otpIntent = intentOf(payload ?? "")

    if (otpIntent) {
        ctx.session.session_db.otpIntent = otpIntent
    }

    if(ctx.config?.isAuth){
        if (otpIntent) {
            await ctx.conversation.enter("otpConversation")
        } else {
            await ctx.conversation.enter("mainConversation")
        }
    }else{
        // Botni ilk marta ishlatgan user: avval login (telefon + PIN), keyin
        // registerConversation oxirida otpIntent bo'yicha avtomatik kod chiqadi.
        await ctx.conversation.enter("registerConversation")

    }
})

bot.callbackQuery('otp_resend', async (ctx) => {
    const expiresAt = ctx.session.session_db.otpExpiresAt
    if (expiresAt && Date.now() < expiresAt) {
        const remaining = Math.ceil((expiresAt - Date.now()) / 1000)
        await ctx.answerCallbackQuery({
            text: ctx.t('otpStillValid', {n: remaining}),
            show_alert: true,
        })
        return
    }

    await ctx.answerCallbackQuery()
    const result = await issueOtp({chatId: ctx.from.id})

    if (!result.ok) {
        await ctx.editMessageText(ctx.t('otpError'), {parse_mode:"HTML"})
        return
    }

    ctx.session.session_db.otpExpiresAt = result.expiresAt
    const codeKey = ctx.session.session_db.otpIntent === 'reset' ? 'otpResetCode' : 'otpCode'
    await ctx.editMessageText(ctx.t(codeKey, {code: result.code}), {
        parse_mode:"HTML",
        reply_markup: Keyboards.otpKeyboard(ctx.t, result.code),
    })
})





bot.filter(hears("loginBtn"), async (ctx) => {
    await ctx.conversation.enter("registerConversation")
})
bot.filter(ctx=>ctx.config.isAuth).filter(hears("logOutBtn"), async (ctx) => {
    // Backend'da DB linkni deaktivatsiya (active=false) — session emas, DB yagona manba.
    // Aks holda bot restartida (MemorySession yo'qoladi) chat qayta auth bo'lib qolardi.
    await authService.deleteUser({id: ctx.from.id})
    ctx.session.session_db.isAuth = false
    ctx.session.session_db.isLogOut = true
    ctx.session.session_db.uuid = null
    await ctx.reply(ctx.t('reLogin'), {parse_mode:"HTML", reply_markup:Keyboards.loginKeyboard(ctx.t)})
})

bot.filter(ctx=>ctx.config.isAuth).filter(hears("ServiceBtn"), async (ctx) => {
    await ctx.conversation.enter("myServiceConversation")
})
bot.filter(ctx=>ctx.config.isAuth).filter(hears("backToServiceMenu"), async (ctx) => {
    await ctx.conversation.enter("myServiceConversation")
})
bot.filter(ctx=>ctx.config.isAuth).filter(hears("backToYearMenu"), async (ctx) => {
    await ctx.conversation.enter("mySalaryConversation")
})
bot.filter(ctx=>ctx.config.isAuth).filter(hears("backToMainMenu"), async (ctx) => {
    await ctx.conversation.enter("mainConversation")
})
bot.filter(hears("cancelOperation"), async (ctx) => {
    await ctx.conversation.enter("mainConversation")
})






const getKeyboard = (key, payload)=>{
    switch (key){
        case 'page':
            return getPaginationKeyboard(payload.data,payload.page, payload.t)
        case 'event':
            return getPaginationEventKeyboard(payload.data,payload.page, payload.t)
        case 'med':
            return getPaginationMedKeyboard(payload.data,payload.page, payload.t)
    }
}

const getMarkdown = (key, payload)=>{
    switch (key){
        case 'page':
            return getMarkdownMsg(payload.data, payload.t, payload.page)
        case 'event':
            return getMarkdownMsgEvent(payload.data, payload.t, payload.page)
        case 'med':
            return getMarkdownMsgMed(payload.data, payload.t, payload.page)
    }
}

const serviceKeys = {
    'page':'dc1a0615566e11a7ebe5f6198e3a0aec',
    'event':'708f8b59a77f3ec5c5f936a514513ece',
    'med':'c5636e99119f742564023ff52399d721',
}

bot.filter(ctx=>ctx.config.isAuth).on("callback_query:data", async ctx => {
    const uuid = ctx.session.session_db.uuid
    const data = ctx.callbackQuery.data
    const [key, rawPage] = data.split(":")
    const serviceKey = serviceKeys[key]
    const page = Number(rawPage)

    // Tanish bo'lmagan callback (eski xabar tugmasi, boshqa format) — jim yopamiz.
    if (!serviceKey || !Number.isInteger(page) || page < 1) {
        await ctx.answerCallbackQuery()
        return
    }

    const date = key === 'event' ? ctx.session.session_db.selectedDate : undefined
    const [response, err] = await authService.getServices({ params:{ service:serviceKey, date}, uuid })

    if (!Array.isArray(response?.data)) {
        logError("pagination", err, { ctx })
        await ctx.answerCallbackQuery({text: ctx.t('serviceUnavailableShort'), show_alert: true})
        return
    }

    const dataList = response.data
    await ctx.editMessageText(getMarkdown(key, {data:dataList, t:ctx.t, page}), {
        parse_mode: "MarkdownV2",
        reply_markup: getKeyboard(key, {data:dataList, t:ctx.t, page})
    })

    await ctx.answerCallbackQuery({
        text: ctx.t('passedPage', {n:page}),
        show_alert: false,
    })


})

bot.command('salary', async (ctx) => {
    await ctx.conversation.enter("mySalaryConversation")
})

bot.filter(ctx=>ctx.config.isAuth).filter(hears("SupportBtn"), async (ctx) => {
    await ctx.reply(ctx.t('supportMsg'), {parse_mode:"HTML"})
})

bot.filter(ctx=>ctx.config.isAuth).filter(hears("ProfileBtn"), async (ctx) => {
    const uuid = ctx.session.session_db.uuid
    const loadingMessage = await ctx.reply(ctx.t('loading'), {parse_mode:"HTML"})
    const [response, error] = await authService.getProfile({uuid})
    await deleteLoader(ctx, loadingMessage.message_id)
    const data = response?.data

    if (!data) {
        logError("profil", error, { ctx })
        await ctx.reply(ctx.t('serviceUnavailable'), {parse_mode:"HTML"})
        return
    }

    // `positions` bo'sh/yo'q bo'lishi mumkin — ?.[0] bo'lmasa TypeError bo'lardi.
    const position = data.positions?.[0]
    const fullName = [data.last_name, data.first_name, data.middle_name].filter(Boolean).join(' ')

    await ctx.reply(ctx.t('profileMsg', {
        fullName: escapeHTML(fullName) || '—',
        position: escapeHTML(position?.position) || '—',
        organization: escapeHTML(position?.organization) || '—',
    }), {parse_mode:"HTML"})
});

bot.filter(ctx=>ctx.config.isAuth).filter(hears("TurniketBtn"), async (ctx) => {
    await ctx.conversation.enter("turniketConversation")
});

bot.filter(ctx=>ctx.config.isAuth).filter(hears("OtpMenuBtn"), async (ctx) => {
    // Menyudan olingan kod — har doim tizimga kirish kodi. Bu qatorsiz, avval
    // reset link'i bilan kelgan userda "parolni tiklash" matni yopishib qolardi.
    ctx.session.session_db.otpIntent = 'otp'
    await ctx.conversation.enter("otpConversation")
});





export const clientComposer =  bot