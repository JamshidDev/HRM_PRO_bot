import { createConversation } from "@grammyjs/conversations"
import {registerConversation} from "./registerConversation.js"


export function registerConversations(composer) {
    composer.use(createConversation(registerConversation, "registerConversation"));
//   add other conversation there
}
