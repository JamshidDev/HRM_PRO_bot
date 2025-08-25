// import express from "express"
import { Bot} from "grammy"
import dotenv from "dotenv"
import cors from 'cors'

import {configComposer, clientComposer} from "./composer/index.js"

dotenv.config()

const PORT = process.env.PORT || 3000
const BASE_URL = process.env.BASE_URL
const TOKEN = process.env.BOT_TOKEN



const bot = new Bot(TOKEN)


bot.use(configComposer)
bot.use(clientComposer)



bot.command('start', async (ctx) => {
    await ctx.reply('Hello!')
})













// Global error catch
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Xato update ${ctx.update.update_id} da:`, err.error);
    ctx.reply(`
<i>❌ Serverda xatolik yuz berdi...</i>

Adminga xabarni yuboring...
    `).catch(() => {})
});

console.log("Bot is running...")
await bot.start({
    drop_pending_updates: true
})

