import express from "express"
import { Bot, webhookCallback} from "grammy"
import dotenv from "dotenv"
import cors from 'cors'

import {configComposer, clientComposer, broadcastComposer} from "./composer/index.js"
import {stopAllWorkers} from "./workers/workerOne.js"
import cron from "node-cron"
import {noteLogger, initialCronJob} from "./utils/helper.js"

dotenv.config({quiet: true})

const PORT = process.env.PORT || 3000
const BASE_URL = process.env.BASE_URL
const TOKEN = process.env.BOT_TOKEN



const bot = new Bot(TOKEN)
const app = express()
app.use(express.json())
app.use(cors())


bot.use(configComposer)
bot.use(clientComposer)
bot.use(broadcastComposer)





bot.command('start', async (ctx) => {
    await ctx.reply('Hello!')
})

bot.command('video', async (ctx)=>{
    const url = new URL('https://www.instagram.com/stories/jaloliddin_mashariipov/3754106076930045612?utm_source=ig_story_item_share&igsh=ejgydjUzZDZ1MnJv')
    url.host = 'kkinstagram.com'
    console.log(url)
    await ctx.replyWithVideo(url.toString())
})

// initialCronJob(bot)


// Global error catch
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Xato update ${ctx.update.update_id} da:`, err.error);
    ctx.reply(`
<i>❌ Serverda xatolik yuz berdi...</i>

Adminga xabarni yuboring...
    `, {
        parse_mode:"HTML"
    }).catch(() => {})
});

await bot.start({
    drop_pending_updates: true,
    allowed_updates: [
        "my_chat_member",
        "chat_member",
        "message",
        "callback_query",
        "inline_query",
        "chat_join_request",
    ],
})







//
//
// // Global error catch
// bot.catch((err) => {
//     const ctx = err.ctx;
//     console.error(`Xato update ${ctx.update.update_id} da:`, err.error);
//     ctx.reply(`
// <i>❌ Serverda xatolik yuz berdi...</i>
//
// Adminga xabarni yuboring...
//     `, {parse_mode:"HTML"}).catch(() => {})
// });
//
// process.on("unhandledRejection", (reason) => {
//     console.error("❌ Unhandled Rejection:", reason)
// })
//
// process.on("uncaughtException", (err) => {
//     console.error("❌ Uncaught Exception:", err)
// })
//
//
// process.on("SIGINT", async () => {
//     await stopAllWorkers()
//     process.exit(0)
// })
// process.on("SIGTERM", async () => {
//     await stopAllWorkers()
//     process.exit(0)
// })
// process.on("beforeExit", async () => {
//     await stopAllWorkers()
// })
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
// app.use(`/${TOKEN}`, webhookCallback(bot, "express"));
//
// app.listen(PORT, async () => {
//     console.log(`🚀 Server http://localhost:${PORT} da ishlayapti`)
//
//     const webhookUrl = `${BASE_URL}/${TOKEN}`
//
//     await bot.api.deleteWebhook({
//         drop_pending_updates: true
//     })
//
//     bot.api.setWebhook(webhookUrl, {
//         allowed_updates:["my_chat_member", "chat_member", "message", "callback_query", "inline_query", "chat_join_request"]
//     }).then((res)=>{
//         console.log(`Webhook bot set to ${webhookUrl}`);
//     }).catch((error)=>{
//         console.log(error)
//     });
// })
//
