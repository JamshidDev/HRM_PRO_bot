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
// const app = express()
// app.use(express.json())
// app.use(cors())

bot.use(configComposer)
bot.use(clientComposer)
















// Global error catch
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Xato update ${ctx.update.update_id} da:`, err.error);
    ctx.reply("❌ Botda xato bo'ldi").catch(() => {})
});

await bot.start({
    drop_pending_updates: true
})

console.log("Bot is running...")
