import {Composer} from "grammy"

const bot = new Composer().chatType('private')


bot.command('start', async (ctx) => {
    return await ctx.reply('Hello!')
})










export const clientComposer =  bot