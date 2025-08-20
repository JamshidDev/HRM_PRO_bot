import express from "express"
import { Bot} from "grammy"
import dotenv from "dotenv"
import cors from 'cors'

import {configComposer, clientComposer} from "./composer/index.js"

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








// const i18n = new I18n({
//     defaultLocale: "uz",
//     useSession: true,
//     directory: "locale",
//     globalTranslationContext(ctx) {
//         return { first_name: ctx.from?.first_name ?? "" };
//     },
// })
// bot.use(session({
//     type: "multi",
//     session_db: {
//         initial: () => {
//             return {
//                 condidate: {
//                     fullname: null,
//                     birthday: null,
//                     picture: null,
//                     pasport:null,
//                     live_adress: null,
//                     birth_adress: null,
//                     phone: null,
//                     education: null,
//                     marital_status: null,
//                 },
//                 children_list: [],
//                 husband_woman: {
//                     fullname: null,
//                     birthday: null,
//                     picture: null,
//                     pasport: null,
//                 },
//                 selected_check:null,
//             }
//         },
//         storage: new MemorySessionStorage(),
//         getSessionKey: (ctx) => ctx.chat?.id.toString(),
//     },
//     conversation: {},
//     __language_code: {},
// }))
// bot.use(i18n)
//
// bot.use(conversations())
















// Global error catch
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Xato update ${ctx.update.update_id} da:`, err.error);
    ctx.reply("❌ Botda xato bo'ldi").catch(() => {})
});






// app.use(`/${TOKEN}`, webhookCallback(bot, "express"))

// app.use((err, req, res, next) => {
//     console.error("Express xatosi:", err);
//     if (!res.headersSent) {
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });

// app.listen(PORT, async () => {
//     console.log(`🚀 Server http://localhost:${PORT} da ishlayapti`)
//
//     const webhookUrl = `${BASE_URL}/${TOKEN}`
//
//     bot.api.setWebhook(webhookUrl, {
//         allowed_updates:["my_chat_member", "chat_member", "message", "callback_query", "inline_query", "chat_join_request"]
//     }).then((res)=>{
//         console.log(`Webhook bot set to ${webhookUrl}`);
//     }).catch((error)=>{
//         console.log(error)
//     });
// })

bot.start()