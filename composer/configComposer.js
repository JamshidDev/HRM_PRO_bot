import { Composer, MemorySessionStorage, session } from "grammy"
import { I18n} from "@grammyjs/i18n"
import {conversations} from "@grammyjs/conversations"
import {registerConversations} from "../conversations/index.js"
import {authService} from "../service/service/index.js"
import {logError} from "../utils/logger.js"
import dotenv from "dotenv"

dotenv.config({quiet: true})
const bot = new Composer()
const notificationId = process.env.NOTIFICATION_ID

const i18n = new I18n({
    defaultLocale: "uz",
    useSession: true,
    directory:'locale',
})

// `ctx.from` yo'q update'larda session kaliti aniqlanmaydi (getSessionKey undefined
// qaytaradi) va quyidagi barcha middleware'lar — session, i18n, auth — xato beradi.
// Bizga bunday update'lar kerak emas, shuning uchun darhol to'xtatamiz.
bot.use(async (ctx, next) => {
    if (!ctx.from) return
    await next()
})

bot.use(session({
    type: "multi",
    session_db: {
        initial: () => {
            return {
                selectedServiceKey:null,
                isLogOut:false,
                isAuth:false,
                uuid:null,
                selectedDate:null,
                otpExpiresAt:null,
                pendingOtpIntent:false,
            }
        },
        storage: new MemorySessionStorage(),
        getSessionKey: (ctx) => ctx.from?.id.toString(),
    },
    conversation: {},
    __language_code: {},
}));
bot.use(i18n)

bot.use(conversations())

bot.use(async (ctx, next) => {
    let permissions = [ctx.t('backToMainMenu'),ctx.t('backToServiceMenu'), ctx.t('backToYearMenu'), '/start', ctx.t('cancelOperation')]
    if (permissions.includes(ctx.message?.text)) {
        const stats = await ctx.conversation.active();
        for (let key of Object.keys(stats)) {
            await ctx.conversation.exit(key);
        }
    }

    const isAuth = ctx.session.session_db.isAuth
    const isLogOut = ctx.session.session_db.isLogOut
    ctx.config = {
        isAuth: false,
        notificationId,
    }

    if(!isAuth && !isLogOut){
        const [response, error] = await authService.checkUserInfo({id:ctx.from.id})

        // uuid'siz hech bir xizmat ishlamaydi — shuning uchun uuid bor bo'lsagina auth deb hisoblaymiz.
        const linkedUuid = response?.data?.user?.uuid

        if(linkedUuid){
            ctx.session.session_db.isAuth = true
            ctx.session.session_db.uuid = linkedUuid
            ctx.config.isAuth = true
        }else{
            // Bu holat yangi (ro'yxatdan o'tmagan) har bir userda chiqadi, ya'ni
            // normal oqim — logger botga yuborilmaydi. Backend'ning haqiqiy
            // nosozliklari (5xx/timeout) service/index.js interceptor'i orqali
            // baribir topic'ga tushadi.
            console.log("🔺 Bazada user ma'lumotlari topilmadi:", error)
        }
    }
    else ctx.config.isAuth = !!isAuth;

    await next()
})

bot.on("my_chat_member", async (ctx)=>{
    const status = ctx.update.my_chat_member.new_chat_member.status
    if(status === 'kicked'){
        const [_,error] = await authService.deleteUser({id:ctx.from.id})
        if(error){
            logError("my_chat_member/deleteUser", error, { ctx })

            // NOTIFICATION_ID sozlanmagan bo'lsa yoki xato matni bo'sh bo'lsa
            // sendMessage o'zi throw qiladi — bu handler'da u unhandled
            // rejection'ga aylanib, botni yiqitishi mumkin edi.
            if(notificationId){
                const text = error?.message || (typeof error === 'string' ? error : JSON.stringify(error))
                try{
                    await ctx.api.sendMessage(notificationId, `❌ deleteUser: ${text}`)
                }catch(sendError){
                    logError("my_chat_member/notify", sendError)
                }
            }
        }
    }
})

registerConversations(bot)


export const configComposer =  bot