import { Composer, MemorySessionStorage, session } from "grammy"
import { I18n} from "@grammyjs/i18n"
import {chatMembers} from "@grammyjs/chat-members"
import {conversations} from "@grammyjs/conversations"
import {registerConversations} from "../conversations/index.js"

const adapter = new MemorySessionStorage()
const bot = new Composer()

bot.use(session({
    type: "multi",
    session_db: {
        initial: () => {
            return {
                client: {
                    phone: null,
                    full_name: null,
                },
                channels:[],
                adminChannels:[],
                selectedChannelId:null
            }
        },
        storage: new MemorySessionStorage(),
    },
    conversation: {},
    __language_code: {},
}))
const i18n = new I18n({
    defaultLocale: "uz",
    useSession: true,
    directory:'i18n',
})

bot.use(i18n)
bot.use(conversations())
registerConversations(bot)
bot.use(chatMembers(adapter))

bot.command('go', async (ctx) => {
  await ctx.conversation.enter("registerConversation")
})

export const configComposer =  bot