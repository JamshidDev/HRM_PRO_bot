import Keyboards from "../keyboards/index.js"
import {issueOtp} from "../utils/otp.js"

export async function otpConversation(conversation, ctx){
    conversation.session.session_db.pendingOtpIntent = false

    const {message_id} = await ctx.reply(ctx.t('loading'), {parse_mode:"HTML"})
    const result = await issueOtp({chatId: ctx.from.id})
    await ctx.api.deleteMessage(ctx.chat.id, message_id)

    if (!result.ok) {
        await ctx.reply(ctx.t('otpError'), {parse_mode:"HTML"})
        return
    }

    conversation.session.session_db.otpExpiresAt = result.expiresAt
    await ctx.reply(ctx.t('otpCode', {code: result.code}), {
        parse_mode:"HTML",
        reply_markup: Keyboards.otpKeyboard(ctx.t, result.code),
    })
}
