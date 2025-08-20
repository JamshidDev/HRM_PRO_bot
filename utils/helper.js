import {InlineKeyboard} from "grammy"

const pageSize = 5

function escapeMarkdownV2(text) {
    return text?.toString().replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&")
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

const getPaginationKeyboard = (data,page=1,t)=>{
    const keyboard = new InlineKeyboard()
    if (page > 1) keyboard.text(t('preview'), `page:${page - 1}`)
    if (page* pageSize < data.length) keyboard.text(t('next'), `page:${page + 1}`)
    return keyboard
}

export {getMarkdownMsg, getPaginationKeyboard}