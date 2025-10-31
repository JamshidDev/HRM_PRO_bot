import { Composer, MemorySessionStorage, session } from "grammy"
import { I18n} from "@grammyjs/i18n"
import {chatMembers} from "@grammyjs/chat-members"
import {conversations} from "@grammyjs/conversations"
import {registerConversations} from "../conversations/index.js"
import {authService} from "../service/service/index.js"
import dotenv from "dotenv"

dotenv.config({quiet: true})
const adapter = new MemorySessionStorage()
const bot = new Composer()
const notificationId = process.env.NOTIFICATION_ID

const i18n = new I18n({
    defaultLocale: "uz",
    useSession: true,
    directory:'locale',
})

bot.use(session({
    type: "multi",
    session_db: {
        initial: () => {
            return {
                selectedServiceKey:null,
                isLogOut:false,
                isAuth:false,
                uuid:null,
            }
        },
        storage: new MemorySessionStorage(),
        getSessionKey: (ctx) => ctx.from?.id.toString(),
    },
    conversation: {},
    __language_code: {},
}));
bot.use(i18n)

bot.use(chatMembers(adapter))
bot.use(conversations())

bot.use(async (ctx, next) => {
    const ADMIN_IDS = [1038293334,5011373330]
    let permissions = [ctx.t('backToMainMenu'),ctx.t('backToServiceMenu'), ctx.t('backToYearMenu'), '/start', ctx.t('cancelOperation')]
    if (permissions.includes(ctx.message?.text)) {
        const stats = await ctx.conversation.active();
        for (let key of Object.keys(stats)) {
            await ctx.conversation.exit(key);
        }
    }

    const isAuth = ctx.session.session_db.isAuth
    const isLogOut = ctx.session.session_db.isLogOut
    ctx.config = {
        isAdmin:ADMIN_IDS.includes(ctx.from.id),
        isAuth: false,
        notificationId,
    }

    if(!isAuth && !isLogOut){
        const [response, error] = await authService.checkUserInfo({id:ctx.from.id})

        if(response?.data){
            ctx.session.session_db.isAuth = true
            ctx.session.session_db.uuid = response.data.user.uuid
            ctx.config.isAuth = true
        }else{
            console.log(error)
            console.log("🔺 Bazada user ma'lumotlari topilmadi...")
        }
    }
    else ctx.config.isAuth = !!isAuth;

    await next()
})

bot.on("my_chat_member", async (ctx)=>{
    const status = ctx.update.my_chat_member.new_chat_member.status
    if(status === 'kicked'){
        const [_,error] = await authService.deleteUser({id:ctx.from.id})
        if(error){
            await ctx.api.sendMessage(ctx.config.notificationId,error?.message )
        }
    }
})

registerConversations(bot)


export const configComposer =  bot