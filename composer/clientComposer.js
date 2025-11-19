import {Composer, Keyboard} from "grammy"
import {authService} from "../service/service/index.js"
import {hears}  from "@grammyjs/i18n"
import {getMarkdownMsg,
    getPaginationKeyboard, escapeMarkdownV2, getPaginationEventKeyboard,getMarkdownMsgEvent, getPaginationMedKeyboard, getMarkdownMsgMed} from "../utils/helper.js"
import Keyboards from "../keyboards/index.js"

const bot = new Composer().chatType('private')



bot.command('start', async (ctx) => {
    if(ctx.config?.isAuth){
        await ctx.conversation.enter("mainConversation")
    }else{
        await ctx.conversation.enter("registerConversation")

    }
})





bot.filter(hears("loginBtn"), async (ctx) => {
    await ctx.conversation.enter("registerConversation")
})
bot.filter(ctx=>ctx.config.isAuth).filter(hears("logOutBtn"), async (ctx) => {
    ctx.session.session_db.isAuth = false
    ctx.session.session_db.isLogOut = true
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
    const uuid = await ctx.session.session_db.uuid
    const data = ctx.callbackQuery.data
    const key = data.split(":")[0]

    await ctx.answerCallbackQuery(

        {
            text:'Hurmatli xodim!\n\nUshbu bo\'limda ko\'rsatilayotgan oyli',
            show_alert: true
        }
    );

    if(!data.toString().includes(':')) return

    const page = Number(data.split(":")[1])
    const serviceKey =serviceKeys[key]
    const date = key==='event'? ctx.session.session_db.selectedDate : undefined
    const [response2] = await authService.getServices({ params:{ service:serviceKey, date}, uuid })
    const dataList = response2.data

    const keyboardBtn = getKeyboard(key, {data:dataList, t:ctx.t, page})
    const markdownText = getMarkdown(key, {data:dataList, t:ctx.t, page})

    await ctx.editMessageText(markdownText, {
        parse_mode: "MarkdownV2",
        reply_markup: keyboardBtn
    })
    await ctx.answerCallbackQuery({
        text: ctx.t('passedPage', {n:page}),
        show_alert: false,
    })


})

bot.command('salary', async (ctx) => {
    await ctx.conversation.enter("mySalaryConversation")
})
bot.filter(ctx=>ctx.config.isAdmin).filter(hears("broadcastMessage"), async (ctx) => {
    await ctx.conversation.enter("adminMsgConversation")
})

bot.filter(ctx=>ctx.config.isAuth).filter(hears("SupportBtn"), async (ctx) => {
    await ctx.reply(ctx.t('supportMsg'), {parse_mode:"HTML"})
})

bot.filter(ctx=>ctx.config.isAuth).filter(hears("ProfileBtn"), async (ctx) => {
    const uuid = ctx.session.session_db.uuid
    const loadingMessage = await ctx.reply(ctx.t('loading'), {parse_mode:"HTML"})
    const [response, error] = await authService.getProfile({uuid})
    await ctx.api.deleteMessage(ctx.chat.id, loadingMessage.message_id)
    const data = response?.data
    const fullName = data?.last_name +' '+ data?.first_name+' '+ data?.middle_name
    const organizationName = data?.positions[0]?.organization
    const positionName = data?.positions[0]?.position
    

    await ctx.reply(ctx.t('profileMsg', {
        fullName:fullName,
        position:positionName,
        organization:organizationName,
    }), {parse_mode:"HTML"})
});

bot.filter(ctx=>ctx.config.isAuth).filter(hears("TurniketBtn"), async (ctx) => {
    await ctx.conversation.enter("turniketConversation")
});





export const clientComposer =  bot