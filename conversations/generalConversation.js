import Keyboards from "../keyboards/index.js"
import {authService} from "../service/service/index.js"
import {Keyboard} from "grammy"
import {getMarkdownMsg, getPaginationKeyboard} from "../utils/helper.js"


const myServiceList = [
    {
        name:"service_dc1a0615566e11a7ebe5f6198e3a0aec",
        key:'dc1a0615566e11a7ebe5f6198e3a0aec'
    },
    {
        name:"service_8514a7291109c3bbbdbafb909070e8b9",
        key:'8514a7291109c3bbbdbafb909070e8b9'
    },
]


export async function mainConversation(conversation, ctx){
    await ctx.reply(ctx.t('mainMenuText'),
        {
            parse_mode:"HTML",
            reply_markup:Keyboards.mainKeyboard(ctx.t)
        })

}



export async function myServiceConversation(conversation, ctx){
    const [response,err] = await authService.servicesUser()
    if(response?.data.length===0){
        await ctx.reply(ctx.t('noService'),{parse_mode:"HTML"})
        return
    }

    const keyboard = new Keyboard()
    response.data.forEach((item)=>{
        keyboard.text(ctx.t(`service_${item}`)).row()
    })

    await ctx.reply(ctx.t('serviceName'),
        {
            parse_mode:"HTML",
            reply_markup:keyboard.text(ctx.t('backToMainMenu')).resized()
        })

    ctx = await conversation.wait()
    function validateService(name){
        return myServiceList.map(v=>ctx.t(v.name)).includes(name)
    }

    if (!validateService(ctx.message?.text)) {
        do {
            await ctx.reply(ctx.t('invalidService'),
                {
                    parse_mode: "HTML",
                }
            )
            ctx = await conversation.wait()
        } while (!validateService(ctx.message?.text))
    }


    const key = myServiceList.map(v=>({...v, name:ctx.t(v.name)})).filter(v=>v.name === ctx.message.text)?.[0]?.key
    conversation.session.session_db.selectedServiceKey = key
    console.log(key)
    if(key===myServiceList[1].key){
        await ctx.reply("Tez orada iwga tuwadi...")
        await mainConversation(conversation, ctx)
        return
    }
    const [response2,_] = await authService.getServices({params:{service:key}})
    const data = response2.data



    await ctx.reply(getMarkdownMsg(data,ctx.t,1), {
        parse_mode: "MarkdownV2",
        reply_markup:getPaginationKeyboard(data,1,ctx.t)
    })
    await mainConversation(conversation, ctx)




}
