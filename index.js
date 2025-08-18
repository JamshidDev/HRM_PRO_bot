import express from "express"
import { Bot, webhookCallback } from "grammy"
import dotenv from "dotenv"
import cors from 'cors'
import {configComposer, clientComposer} from "./composer/index.js"
import "./config/mongodbConfig.js"


dotenv.config()

const PORT = process.env.PORT || 3000
const BASE_URL = process.env.BASE_URL
const TOKEN = process.env.BOT_TOKEN


const bot = new Bot(TOKEN)
const app = express()
app.use(express.json())
app.use(cors())

bot.use(configComposer)
bot.use(clientComposer)






















app.use(`/${TOKEN}`, webhookCallback(bot, "express"));


app.listen(PORT, async () => {
    console.log(`🚀 Server http://localhost:${PORT} da ishlayapti`)

    const webhookUrl = `${BASE_URL}/${TOKEN}`

    bot.api.setWebhook(webhookUrl, {
        allowed_updates:["my_chat_member", "chat_member", "message", "callback_query", "inline_query", "chat_join_request"]
    }).then((res)=>{
        console.log(`Webhook bot set to ${webhookUrl}`);
    }).catch((error)=>{
        console.log(error)
    });
})



process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled Rejection:", reason)
})

process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err)
})
