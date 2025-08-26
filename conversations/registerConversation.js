import Keyboards from "../keyboards/index.js"
import {authService} from "../service/service/index.js"
import {mainConversation} from "./generalConversation.js"


const validatePin = (pin)=>{
    return (isFinite(pin) && pin.toString().length === 14)
}



export async function registerConversation(conversation, ctx){
    await ctx.reply(ctx.t('loginSystem',
        {id:ctx.from.id,
         name:ctx.from.first_name
        }), {
        parse_mode:"HTML",
        reply_markup:Keyboards.phoneKeyboard(ctx.t)
    })

    ctx = await conversation.wait()

    if (!ctx.message?.contact) {
        do {
            await ctx.reply(ctx.t('invalidContact'),
                {
                    parse_mode: "HTML",
                }
            )
            ctx = await conversation.wait()
        } while (!ctx.message?.contact)
    }
    const phone  = ctx.message.contact.phone_number.toString().slice(-9)
    await ctx.reply(ctx.t('enterPassportPin'), {
        parse_mode:"HTML",
        reply_markup:{
            remove_keyboard:true
        }
    })


    ctx = await conversation.wait()
    if (!validatePin(ctx.message?.text)) {
        do {
            await ctx.reply(ctx.t('invalidPassportPin'),
                {
                    parse_mode: "HTML",
                }
            )
            ctx = await conversation.wait()
        } while (!validatePin(ctx.message?.text))
    }
     const pin = Number(ctx.message.text)

    const data = {
        phone,
        pin
    }
    const {message_id} = await ctx.reply(ctx.t('loading'),{parse_mode:"HTML"})
    const [response, error] = await authService.checkRegisterUser({data})
    await ctx.api.deleteMessage(ctx.chat.id, message_id)
    if(!response?.data){
        await ctx.reply(ctx.t('notFoundUser'),{parse_mode:"HTML"})
        await ctx.reply(ctx.t('reLogin'), {parse_mode:"HTML", reply_markup:Keyboards.loginKeyboard(ctx.t)})
        return
    }
    const {worker} = response?.data.user
    const fullName = `${worker.first_name} ${worker.last_name} ${worker.middle_name}`
    await ctx.replyWithPhoto(worker.photo,{
        caption:ctx.t('isThisYou', {name:fullName}),
        reply_markup:Keyboards.yesOrNoKeyboard(ctx.t),
        parse_mode:"HTML"
    })
    const uuid = response?.data.user.uuid
    conversation.session.session_db.uuid = response?.data.user.uuid




    const validateQuestion = (msg, t)=>{
        return [t('yes'), t('no')].includes(msg)
    }
    ctx = await conversation.wait()
    if (!validateQuestion(ctx.message?.text, ctx.t)) {
        do {
            await ctx.reply(ctx.t('invalidShortAnswer'),
                {
                    parse_mode: "HTML",
                }
            )
            ctx = await conversation.wait()
        } while (!validateQuestion(ctx.message?.text, ctx.t))
    }
    const shortAnswer = ctx.message.text
    if(shortAnswer === ctx.t('yes')){
        const msg = await ctx.reply(ctx.t('loading'),{parse_mode:"HTML"})
        await authService.registerUser({data:{uuid, chat_id:ctx.from.id}})
        await ctx.api.deleteMessage(ctx.chat.id, msg.message_id)
        conversation.session.session_db.isAuth = true
        conversation.session.session_db.isLogOut = false
        await mainConversation(conversation, ctx)

    }else{
        await ctx.reply(ctx.t('reLogin'), {parse_mode:"HTML", reply_markup:Keyboards.loginKeyboard(ctx.t)})
    }





}




