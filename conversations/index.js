import { createConversation } from "@grammyjs/conversations"
import {registerConversation} from "./registerConversation.js"
import {mainConversation, myServiceConversation} from "./generalConversation.js"


export function registerConversations(composer) {
    composer.use(createConversation(registerConversation))
    composer.use(createConversation(mainConversation))
    composer.use(createConversation(myServiceConversation))
}
