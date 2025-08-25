import Keyboards from "../keyboards/index.js"
import {authService} from "../service/service/index.js"
import {Keyboard} from "grammy"
import numeral from "numeral"

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

const monthList = [
    {
        name:'month_1',
        id:1,
    },
    {
        name:'month_2',
        id:2,
    },
    {
        name:'month_3',
        id:3,
    },
    {
        name:'month_4',
        id:4,
    },
    {
        name:'month_5',
        id:5,
    },
    {
        name:'month_6',
        id:6,
    },
    {
        name:'month_7',
        id:7,
    },
    {
        name:'month_8',
        id:8,
    },
    {
        name:'month_9',
        id:9,
    },
    {
        name:'month_10',
        id:10,
    },
    {
        name:'month_11',
        id:11,
    },
    {
        name:'month_12',
        id:12,
    },
]

function escapeMarkdownV2(text) {
    return text?.toString().replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&")
}


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
    if(key===myServiceList[1].key){
        await mySalaryConversation(conversation, ctx)
        return
    }
    const [response2,error] = await authService.getServices({params:{service:key}})
    console.log(error)
    console.log(response2)
    const data = response2.data



    await ctx.reply(getMarkdownMsg(data,ctx.t,1), {
        parse_mode: "MarkdownV2",
        reply_markup:getPaginationKeyboard(data,1,ctx.t)
    })
    await mainConversation(conversation, ctx)




}


export async function mySalaryConversation(conversation, ctx){
    const serviceKey =conversation.session.session_db.selectedServiceKey
    const {message_id} = await ctx.reply(ctx.t('loading'),{parse_mode:"HTML"})
    const [response,_] = await authService.getServices({params:{service:serviceKey}})
    await ctx.api.deleteMessage(ctx.chat.id, message_id)
    if(response?.months.length===0){
        await ctx.reply(ctx.t('notFoundData'),{parse_mode:"HTML"})
        return
    }

    const months = response.months
    const salaryKey = response.check_salary_key

    const yearList = [...new Set(months.map(v=>v.year))]
    const yearKeyboard = new Keyboard()
    yearList.forEach((item, index)=>{
        yearKeyboard.text(item)
        if(index%2===1){
            yearKeyboard.row()
        }
    })
    yearKeyboard.row()
    yearKeyboard.text(ctx.t('backToServiceMenu'))
    yearKeyboard.resized()

    await ctx.reply(ctx.t('selectYear'),
        {
            parse_mode:"HTML",
            reply_markup:yearKeyboard
        })

    function validateYear(name){
        return yearList.includes(Number(name))
    }
    ctx = await conversation.wait()

    if (!validateYear(ctx.message?.text)) {
        do {
            await ctx.reply(ctx.t('invalidYear'),
                {
                    parse_mode: "HTML",
                }
            )
            ctx = await conversation.wait()
        } while (!validateYear(ctx.message?.text))
    }

    const selectedMonths=months.filter((v)=>v.year ===Number(ctx.message.text)).sort((a,b)=>a.month-b.month)
    const selectedYear = selectedMonths[0].year

    const monthKeyboard = new Keyboard()
    selectedMonths.forEach((item, index)=>{
        monthKeyboard.text(ctx.t(`month_${item.month}`),)
        if(index%2===1){
            monthKeyboard.row()
        }
    })
    monthKeyboard.row()
    monthKeyboard.text(ctx.t('backToYearMenu'))
    monthKeyboard.resized()

    while(true){

        await ctx.reply(ctx.t('selectMonth', {n:selectedYear}),
            {
                parse_mode:"HTML",
                reply_markup:monthKeyboard
            })

        function validateMonth(name){
            return monthList.map(v=>ctx.t(v.name)).includes(name)
        }
        ctx = await conversation.wait()

        if(ctx.message?.text === ctx.t('backToYearMenu')){
           await mySalaryConversation(conversation, ctx)
            break

        }

        if (!validateMonth(ctx.message?.text)) {
            do {
                await ctx.reply(ctx.t('invalidYear'),
                    {
                        parse_mode: "HTML",
                    }
                )
                ctx = await conversation.wait()
            } while (!validateMonth(ctx.message?.text))
        }

        const selectedMonth = monthList.filter(v=>ctx.t(v.name) === ctx.message.text)[0].id

        const loadingMsg = await ctx.reply(ctx.t('loading'),{parse_mode:"HTML"})
        const [salaryResponse,err] = await authService.getServices({params:{service:salaryKey,year:selectedYear,month:selectedMonth}})
        await ctx.api.deleteMessage(ctx.chat.id, loadingMsg.message_id)
        await sendSalaryData(salaryResponse.salary, ctx)
    }

















}

const sendSalaryData =async (salaryData, ctx)=>{
    for (const v of salaryData) {

        let inText = ""
        let outText = ""
        let cardMoney = ""

        for (const item of v.in) {
            inText += `\n>🔹${escapeMarkdownV2(item.code)} \\- ${escapeMarkdownV2(item.type)} \\- ${escapeMarkdownV2(item.amount)} so'm`
        }
        inText += `\n\n>⚡️Jami hisoblandi\\: ${v.in_total} so'm`


        for (const item of v.out) {
            outText += `\n>🔸${escapeMarkdownV2(item.code)} \\- ${escapeMarkdownV2(item.type)} \\- ${escapeMarkdownV2(item.amount)} so'm`
        }
        outText += `\n\n>⚡️Jami ushlanma\\: ${v.out_total} so'm`

        cardMoney = `\n\n\n\n>💳${v?.in_card?.code} \\: *${escapeMarkdownV2(numeral(v.in_card?.amount).format('0,0'))}* so'm `


        const msgMarkdown2 =
            `
*OYLIK HISOBOT*

👤 Ism: *${escapeMarkdownV2(v.worker?.full_name)}*
💰 Oklad: *${escapeMarkdownV2(numeral(v.worker?.main_salary).format('0,0'))} so'm*
🏅 Lavozim: *${escapeMarkdownV2(v.worker?.position)}* 
🌐 Korxona: *${escapeMarkdownV2(v.worker?.organization)}*

📆 Ish soati: *${escapeMarkdownV2(v.worker?.work_time)} soat*
 ` + '\n *🔹KIRIMLAR🔹*'
            + inText
            + '\n\n *🔸CHIQIMLAR🔸*'
            + outText
            + cardMoney


        await ctx.reply(msgMarkdown2, {
            parse_mode: "MarkdownV2",
            reply_markup: {
                remove_keyboard: true,
            },
        })
    }
}
