import Keyboards from "../keyboards/index.js"
import {authService} from "../service/service/index.js"
import {Keyboard} from "grammy"
import numeral from "numeral"
import {
    escapeMarkdownV2,
    deleteLoader,
    getMarkdownMsg,
    getMarkdownMsgEvent,
    getPaginationKeyboard,
    getPaginationEventKeyboard,
    getMarkdownMsgMed,
    getPaginationMedKeyboard,
} from "../utils/helper.js"





const SERVICE_KEYS = {
    SALARY: '8514a7291109c3bbbdbafb909070e8b9',
    TURNIKET: '708f8b59a77f3ec5c5f936a514513ece',
    MEDICAL: 'c5636e99119f742564023ff52399d721',
}

const myServiceList = [
    {
        name:"service_dc1a0615566e11a7ebe5f6198e3a0aec",
        key:'dc1a0615566e11a7ebe5f6198e3a0aec',
        visible:true,
    },
    {
        name:"service_8514a7291109c3bbbdbafb909070e8b9",
        key:SERVICE_KEYS.SALARY,
        visible:true,
    },
    {
        name:"service_708f8b59a77f3ec5c5f936a514513ece",
        key:SERVICE_KEYS.TURNIKET,
        visible:false,
    },
    {
        name:"service_c5636e99119f742564023ff52399d721",
        key:SERVICE_KEYS.MEDICAL,
        visible:true,
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








export async function mainConversation(conversation, ctx){
    await ctx.reply(ctx.t('mainMenuText'),
        {
            parse_mode:"HTML",
            reply_markup:Keyboards.mainKeyboard(ctx)
        })

}

export async function myServiceConversation(conversation, ctx){
    const uuid = conversation.session.session_db.uuid
    const {message_id: loadingMsgId} = await ctx.reply(ctx.t('loading'),{parse_mode:"HTML"})
    const [response,err] = await authService.servicesUser({uuid})
    await deleteLoader(ctx, loadingMsgId)

    // Backend yiqilsa/timeout bo'lsa response null keladi — .data'ga tegmasdan chiqamiz.
    if(!Array.isArray(response?.data)){
        console.log("🔺 servicesUser xatosi:", err)
        await ctx.reply(ctx.t('serviceUnavailable'),{parse_mode:"HTML"})
        await mainConversation(conversation, ctx)
        return
    }

    if(response.data.length===0){
        await ctx.reply(ctx.t('noService'),{parse_mode:"HTML"})
        return
    }

    // Show only services that are visible in myServiceList and exist in API response (key === id)
    const availableServiceIds = response.data.map(v => v.id)
    const visibleServices = myServiceList.filter(s => s.visible && availableServiceIds.includes(s.key))

    if (visibleServices.length === 0){
        await ctx.reply(ctx.t('noService'),{parse_mode:"HTML"})
        return
    }

    const keyboard = new Keyboard()
    visibleServices.forEach((item)=>{
        keyboard.text(ctx.t(item.name)).row()
    })

    await ctx.reply(ctx.t('serviceName'),
        {
            parse_mode:"HTML",
            reply_markup:keyboard.text(ctx.t('backToMainMenu')).resized()
        })

    ctx = await conversation.wait()
    function validateService(name){
        return visibleServices.map(v=>ctx.t(v.name)).includes(name)
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

    const selected = visibleServices.find(v => ctx.t(v.name) === ctx.message.text)
    const key = selected?.key
    conversation.session.session_db.selectedServiceKey = key
    if(key===SERVICE_KEYS.SALARY){
        await mySalaryConversation(conversation, ctx)
        return
    }
    else if(key===SERVICE_KEYS.MEDICAL){
        await getMedConversation(conversation, ctx)
        return
    }

    const {message_id: loadingMsgId2} = await ctx.reply(ctx.t('loading'),{parse_mode:"HTML"})
    const [response2,error] = await authService.getServices({params:{service:key}, uuid})
    await deleteLoader(ctx, loadingMsgId2)

    if(!Array.isArray(response2?.data)){
        console.log("🔺 getServices xatosi:", error)
        await ctx.reply(ctx.t('serviceUnavailable'),{parse_mode:"HTML"})
        await mainConversation(conversation, ctx)
        return
    }

    const data = response2.data

    await ctx.reply(getMarkdownMsg(data,ctx.t,1), {
        parse_mode: "MarkdownV2",
        reply_markup:getPaginationKeyboard(data,1,ctx.t)
    })
    await mainConversation(conversation, ctx)
}

export async function mySalaryConversation(conversation, ctx){
    const uuid = conversation.session.session_db.uuid
    const serviceKey =conversation.session.session_db.selectedServiceKey
    const {message_id} = await ctx.reply(ctx.t('loading'),{parse_mode:"HTML"})
    const [response,err] = await authService.getServices({params:{service:serviceKey}, uuid})
    await deleteLoader(ctx, message_id)

    if(!Array.isArray(response?.months)){
        console.log("🔺 oylik (months) xatosi:", err)
        await ctx.reply(ctx.t('serviceUnavailable'),{parse_mode:"HTML"})
        await mainConversation(conversation, ctx)
        return
    }

    if(response.months.length===0){
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
        const [salaryResponse,salaryErr] = await authService.getServices({params:{service:salaryKey,year:selectedYear,month:selectedMonth}, uuid})
        await deleteLoader(ctx, loadingMsg.message_id)

        // Xato bo'lsa siklni uzmaymiz — user boshqa oyni tanlab ko'rishi mumkin.
        if(!Array.isArray(salaryResponse?.salary)){
            console.log("🔺 oylik hisobot xatosi:", salaryErr)
            await ctx.reply(ctx.t('serviceUnavailable'),{parse_mode:"HTML"})
            continue
        }

        await sendSalaryData(salaryResponse.salary, ctx)

        await ctx.reply(ctx.t('salaryAlertMessage'), {
            parse_mode:"HTML"
        });
    }

















}

const sendSalaryData =async (salaryData, ctx)=>{
    for (const v of salaryData) {

        let inText = ""
        let outText = ""
        let cardMoney = ""

        // Summalarda `.` / `-` bo'lishi mumkin — eskeyplanmasa Telegram "can't parse entities" 400 beradi.
        for (const item of v.in ?? []) {
            inText += `\n>🔹${escapeMarkdownV2(item.code)} \\- ${escapeMarkdownV2(item.type)} \\- ${escapeMarkdownV2(item.amount)} so'm`
        }
        inText += `\n\n>⚡️Jami hisoblandi\\: ${escapeMarkdownV2(v.in_total)} so'm`


        for (const item of v.out ?? []) {
            outText += `\n>🔸${escapeMarkdownV2(item.code)} \\- ${escapeMarkdownV2(item.type)} \\- ${escapeMarkdownV2(item.amount)} so'm`
        }
        outText += `\n\n>⚡️Jami ushlanma\\: ${escapeMarkdownV2(v.out_total)} so'm`

        cardMoney = `\n\n\n\n>💳${escapeMarkdownV2(v?.in_card?.code)} \\: *${escapeMarkdownV2(numeral(v.in_card?.amount).format('0,0'))}* so'm `


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

export async function turniketConversation(conversation, ctx){
    const uuid = conversation.session.session_db.uuid
    const {message_id: loadingMsgId} = await ctx.reply(ctx.t('loading'), {parse_mode:"HTML"})
    const [response] = await authService.servicesUser({uuid})
    await deleteLoader(ctx, loadingMsgId)

    const availableServiceIds = response?.data?.map(v => v.id) || []
    const turniketServices = myServiceList.filter(s => !s.visible && availableServiceIds.includes(s.key))

    if (turniketServices.length === 0){
        await ctx.reply(ctx.t('noService'), {parse_mode: "HTML"})
        await mainConversation(conversation, ctx)
        return
    }

    const keyboard = new Keyboard()
    turniketServices.forEach((s)=>{
        keyboard.text(ctx.t(s.name)).row()
    })

    await ctx.reply(ctx.t('turniketMenuText'), {
        parse_mode:"HTML",
        reply_markup:keyboard.text(ctx.t('backToMainMenu')).resized()
    })

    ctx = await conversation.wait()

    // Back handling
    if (ctx.message?.text === ctx.t('backToMainMenu')){
        await mainConversation(conversation, ctx)
        return
    }

    const isValid = turniketServices.map(v=>ctx.t(v.name)).includes(ctx.message?.text)
    if (!isValid){
        await ctx.reply(ctx.t('invalidTurniketChoice'))
        await turniketConversation(conversation, ctx)
        return
    }

    const selected = turniketServices.find(v => ctx.t(v.name) === ctx.message.text)
    const key = selected?.key
    conversation.session.session_db.selectedServiceKey = key

    // Route based on selected key
    if(key===SERVICE_KEYS.TURNIKET){
        await getTodayEvents(ctx, conversation)
        await selectDateConversation(conversation, ctx)
        return
    }

    // Fallback to main
    await mainConversation(conversation, ctx)
}

export async function selectDateConversation(conversation, ctx){
    await ctx.reply(ctx.t('selectDateText'), {
        parse_mode:"HTML",
        reply_markup:Keyboards.cancelOperationKeyboard(ctx.t)
    })

    function validateDateFormat(dateString) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(dateString)) {
            return false
        }
        
        const date = new Date(dateString)
        const year = parseInt(dateString.substring(0, 4))
        const month = parseInt(dateString.substring(5, 7))
        const day = parseInt(dateString.substring(8, 10))
        
        return date.getFullYear() === year && 
               date.getMonth() === month - 1 && 
               date.getDate() === day
    }

    do {
        ctx = await conversation.wait()
        
        if (ctx.message?.text === ctx.t('cancelOperation')) {
            await mainConversation(conversation, ctx)
            return
        }
        
        if (!validateDateFormat(ctx.message?.text)) {
            await ctx.reply(ctx.t('invalidDateFormat'), {
                parse_mode:"HTML",
                reply_markup:Keyboards.cancelOperationKeyboard(ctx.t)
            })
        }
    } while (!validateDateFormat(ctx.message?.text))

    // Store the selected date in session
    const date = ctx.message.text
    conversation.session.session_db.selectedDate = date

    const service = conversation.session.session_db.selectedServiceKey || SERVICE_KEYS.TURNIKET
    const uuid = conversation.session.session_db.uuid

    const [response,err] = await authService.getServices({uuid, params:{service, date}})

    if(!Array.isArray(response?.data)){
        console.log("🔺 turniket hodisalari xatosi:", err)
        await ctx.reply(ctx.t('serviceUnavailable'), {parse_mode: "HTML"})
        await mainConversation(conversation, ctx)
        return
    }

    if(response.data.length === 0){
        await ctx.reply(ctx.t('noData'), {parse_mode: "HTML"})
        await selectDateConversation(conversation, ctx)
        return
    }

    const data = response.data
    await ctx.reply(getMarkdownMsgEvent(data,ctx.t,1), {
        parse_mode: "MarkdownV2",
        reply_markup:getPaginationEventKeyboard(data,1,ctx.t)
    })
    await mainConversation(conversation, ctx)

}

async function getMedConversation(conversation, ctx){
    const service = conversation.session.session_db.selectedServiceKey || SERVICE_KEYS.MEDICAL
    const uuid = conversation.session.session_db.uuid

    const [response,err] = await authService.getServices({uuid, params:{service}})

    if(!Array.isArray(response?.data)){
        console.log("🔺 tibbiy ko'rik xatosi:", err)
        await ctx.reply(ctx.t('serviceUnavailable'), {parse_mode: "HTML"})
        await mainConversation(conversation, ctx)
        return
    }

    if(response.data.length ===0){
        await ctx.reply(ctx.t('noData'), {parse_mode: "HTML"})
        await mainConversation(conversation, ctx)
        return
    }
    const data = response.data

    await ctx.reply(getMarkdownMsgMed(data,ctx.t,1), {
        parse_mode: "MarkdownV2",
        reply_markup:getPaginationMedKeyboard(data,1,ctx.t)
    })
    await mainConversation(conversation, ctx)
}

const getTodayEvents = async(ctx, conversation)=>{
    const serviceKey = SERVICE_KEYS.TURNIKET
    const uuid = conversation.session.session_db.uuid
    const [response,err] = await authService.getServices({uuid, params:{service:serviceKey}})

    // Bu "bonus" ko'rsatkich — xato bo'lsa jim o'tkazamiz, keyingi qadam (sana tanlash) davom etadi.
    if(!Array.isArray(response?.data)){
        console.log("🔺 bugungi hodisalar xatosi:", err)
        return
    }

    await ctx.reply(getMarkdownMsgEvent(response.data,ctx.t,1), {
        parse_mode: "MarkdownV2",
    })
}



