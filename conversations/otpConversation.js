import Keyboards from "../keyboards/index.js"
import {issueOtp} from "../utils/otp.js"
import {deleteLoader} from "../utils/helper.js"

export async function otpConversation(conversation, ctx){
    // Maqsad kod xabarining matnini belgilaydi. "Yangi kod olish" tugmasi ham
    // shu qiymatga qarab bir xil matnni saqlab qoladi, shuning uchun bu yerda
    // tozalanmaydi — keyingi deep link uni qayta yozadi.
    const isReset = conversation.session.session_db.otpIntent === 'reset'
    const codeKey = isReset ? 'otpResetCode' : 'otpCode'

    const {message_id} = await ctx.reply(ctx.t('loading'), {parse_mode:"HTML"})
    // conversation.external: bu chaqiruv grammY orqali o'tmaydi, shuning uchun
    // conversation qayta ijro etilganda (har bir yangi update'da) yana
    // bajarilardi — backend'dan YANGI kod so'ralib, userga allaqachon
    // ko'rsatilgan kod bilan mos kelmay qolardi. Ustiga issueOtp ichida
    // Date.now() bor, ya'ni expiresAt ham har replay'da siljib ketardi.
    const chatId = ctx.from.id
    const result = await conversation.external(() => issueOtp({chatId}))
    await deleteLoader(ctx, message_id)

    if (!result.ok) {
        await ctx.reply(ctx.t('otpError'), {parse_mode:"HTML"})
        return
    }

    conversation.session.session_db.otpExpiresAt = result.expiresAt
    await ctx.reply(ctx.t(codeKey, {code: result.code}), {
        parse_mode:"HTML",
        reply_markup: Keyboards.otpKeyboard(ctx.t, result.code),
    })
}
