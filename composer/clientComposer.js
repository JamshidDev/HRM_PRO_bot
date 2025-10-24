import {Composer, Keyboard} from "grammy"
import {authService} from "../service/service/index.js"
import {mainConversation} from "../conversations/generalConversation.js"
import {hears}  from "@grammyjs/i18n"
import {getMarkdownMsg, getPaginationKeyboard, escapeMarkdownV2, getPaginationEventKeyboard,getMarkdownMsgEvent} from "../utils/helper.js"
import Keyboards from "../keyboards/index.js"

const bot = new Composer().chatType('private')



bot.command('start', async (ctx) => {
    const currentLocale = await ctx.i18n.getLocale()
    if(ctx.config?.isAuth){
        await ctx.conversation.enter("mainConversation")
    }else{
        await ctx.conversation.enter("registerConversation")

    }
})

bot.command('upload', async (ctx)=>{
    await ctx.conversation.enter("uploadImageConversation")
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








bot.filter(ctx=>ctx.config.isAuth).on("callback_query:data", async ctx => {
    const uuid = await ctx.session.session_db.uuid
    const data = ctx.callbackQuery.data
    const isEvent =data.startsWith("event:")
    console.log(isEvent);
    console.log(data.startsWith("page:"));
    

    
    
    if (data.startsWith("page:") || data.startsWith("event:")) {
        const page = Number(data.split(":")[1])
        const serviceKey =isEvent? '708f8b59a77f3ec5c5f936a514513ece' :  'dc1a0615566e11a7ebe5f6198e3a0aec'
        const [response2] = await authService.getServices({ params:{ service:serviceKey }, uuid })
        const dataList = response2.data
        console.log(dataList);
        
        
        const MarkDownContent = isEvent? getMarkdownMsgEvent(dataList, ctx.t, page) : getMarkdownMsg(dataList, ctx.t, page)
        const paginationCallback =isEvent? getPaginationEventKeyboard(dataList, page, ctx.t) : getPaginationKeyboard(dataList, page, ctx.t)

    await ctx.editMessageText(MarkDownContent, {
        parse_mode: "MarkdownV2",
        reply_markup: paginationCallback
    })
    await ctx.answerCallbackQuery({
        text: ctx.t('passedPage', {n:page}),
        show_alert: false,
    })

        
    }
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
    await ctx.reply(ctx.t('profileMsg', {
        fullName:"Raximov Jamshid Shuxrat",
        position:"Lavozim",
        organization:"Korxona",
    }), {parse_mode:"HTML"})
});

bot.filter(ctx=>ctx.config.isAuth).filter(hears("TurniketBtn"), async (ctx) => {
    await ctx.conversation.enter("turniketConversation")
});

bot.command('test', async(ctx)=>{
    await ctx.conversation.enter("selectDateConversation")
})




export const clientComposer =  bot