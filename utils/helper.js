import {InlineKeyboard} from "grammy"
import dotenv from "dotenv"
import cron from "node-cron"
import {initialBroadcastMsg} from "../workers/workerOne.js"


dotenv.config({quiet: true})

const notificationId = process.env.NOTIFICATION_ID
const pageSize = 15

export function escapeMarkdownV2(text) {
    return text?.toString().replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&")
}

export function escapeHTML(text) {
    return text
        ?.toString()
        // 1️⃣ yashirin belgilarni o‘chirish
        .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
        // 2️⃣ HTML escapelash
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .trim();
  }

const getMarkdownMsg = (data,t, page=1)=>{
    const totalItems = data.length
    const start = (page-1) * pageSize
    const end = start + pageSize
    const pageItems = data.map((v, index)=>({...v,number:index+1 })).slice(start, end)
    let msgMarkdown2 =t('terminalStatus')+`\n`
    for (const item of pageItems) {
        msgMarkdown2 += `\n> ${item.number}\\. ${item.status===1? '🔹' :'🔸'} ${escapeMarkdownV2(item.name)}`
    }
    msgMarkdown2 += `
\n\n ${t('totalTerminal', {n:totalItems})}
${t('currentPage', {n:page})}
`

    return msgMarkdown2
}

const getMarkdownMsgEvent = (data,t, page=1)=>{
    const totalItems = data.length
    const start = (page-1) * pageSize
    const end = start + pageSize
    const pageItems = data.map((v, index)=>({...v,number:index+1 })).slice(start, end)
    let msgMarkdown2 =t('eventStatus')+`\n`
    for (const item of pageItems) {
        msgMarkdown2 += `\n> ${item.number}\\. ${item?.direction? '🔹' :'🔸'} ${escapeMarkdownV2(item.event_date)}\\ ${escapeMarkdownV2(item.event_time)}`
    }
    msgMarkdown2 += `
\n\n ${t('totalEvent', {n:totalItems})}
${t('currentPage', {n:page})}
`

    return msgMarkdown2
}

const getMarkdownMsgMed = (data,t, page=1)=>{
    const pageSize = 10
    const totalItems = data.length
    const start = (page-1) * pageSize
    const end = start + pageSize
    const pageItems = data.map((v, index)=>({...v,number:index+1 })).slice(start, end)
    let msgMarkdown2 =t('medMessageTitle')+`\n\n`
    for (const item of pageItems) {
//         msgMarkdown2 += `
// \n> ${item.number}\\. ${item?.status} \n> ${escapeMarkdownV2(item.from)} \n> ${escapeMarkdownV2(item.to)}`
        msgMarkdown2 +=t('medContent', {
            number:item.number,
            status:item?.status,
            from:escapeMarkdownV2(item.from),
            to:escapeMarkdownV2(item.to),
        }) + '\n\n'


    }
    msgMarkdown2 += `${t('totalMed', {n:totalItems})}
${t('currentPage', {n:page})}
`

    return msgMarkdown2
}

const getPaginationKeyboard = (data,page=1,t)=>{
    const keyboard = new InlineKeyboard()
    if (page > 1) keyboard.text(t('preview'), `page:${page - 1}`)
    if (page* pageSize < data.length) keyboard.text(t('next'), `page:${page + 1}`)
    return keyboard
}
const getPaginationEventKeyboard = (data,page=1,t)=>{
    const keyboard = new InlineKeyboard()
    if (page > 1) keyboard.text(t('preview'), `event:${page - 1}`)
    if (page* pageSize < data.length) keyboard.text(t('next'), `event:${page + 1}`)
    return keyboard
}
const getPaginationMedKeyboard = (data,page=1,t)=>{
    const pageSize = 10
    const eventKey = 'med'
    const keyboard = new InlineKeyboard()
    if (page > 1) keyboard.text(t('preview'), `${eventKey}:${page - 1}`)
    if (page* pageSize < data.length) keyboard.text(t('next'), `${eventKey}:${page + 1}`)
    return keyboard
}

const noteLogger = async (bot, title, msg, error=true)=>{
    await bot.api.sendMessage(notificationId, `
*${error? '⚠️' : '✅'} ${error? title : 'Xabar'}*

${error? 'Error message:':'Message'}
>${escapeMarkdownV2(msg)}`
,{parse_mode:"MarkdownV2"} )
}

const initialCronJob = (bot)=>{
    console.log("🕑 cron job ishga tushdi — O‘zbekiston vaqti bo‘yicha 07:00 da")
    cron.schedule("0 7 * * *", async () => {
        await noteLogger(bot, null, "🕑 Cron job ishga tushdi — O‘zbekiston vaqti bo‘yicha 07:00 da", false)
        await initialBroadcastMsg(bot, 1, 1)
    },{
        timezone: "Asia/Tashkent"
    })
}

export {getMarkdownMsg, getPaginationKeyboard, noteLogger, initialCronJob, getMarkdownMsgEvent, getPaginationEventKeyboard , getMarkdownMsgMed, getPaginationMedKeyboard}