import { Composer, MemorySessionStorage, session } from "grammy"
import { I18n} from "@grammyjs/i18n"
import {chatMembers} from "@grammyjs/chat-members"
import {conversations, createConversation} from "@grammyjs/conversations"
import {registerConversations} from "../conversations/index.js"
import {authService} from "../service/service/index.js"
import {setUserId} from "../service/index.js"
//
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)

const adapter = new MemorySessionStorage()
const bot = new Composer()

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
            }
        },
        storage: new MemorySessionStorage(),
    },
    conversation: {},
    __language_code: {},
}));
bot.use(i18n)

bot.use(chatMembers(adapter))
bot.use(conversations())

bot.use(async (ctx, next) => {
    let permissions = [ctx.t('backToMainMenu')]
    console.log(permissions.includes(ctx.message?.text))
    if (permissions.includes(ctx.message?.text)) {
        const stats = await ctx.conversation.active();
        for (let key of Object.keys(stats)) {
            await ctx.conversation.exit(key);
        }
    }

    const isAuth = ctx.session.session_db.isAuth
    const isLogOut = ctx.session.session_db.isLogOut

    if(!isAuth && !isLogOut){
        const [response, error] = await authService.checkUserInfo({id:ctx.from.id})

        if(response.data){
            console.log("🔸 Bazada user ma'lumotlari topildi...")
            setUserId(response.data.user.uuid)
            ctx.session.session_db.isAuth = true
            ctx.config = {
                isAuth: true
            }
        }else{
            console.log(error)
            console.log("🔺 Bazada user ma'lumotlari topilmadi...")
            ctx.config = {
                isAuth: false
            }
        }
    }
    else if(isAuth) ctx.config = {isAuth: true}
    else ctx.config = {isAuth: false}


    await next()
})

registerConversations(bot)


export const configComposer =  bot