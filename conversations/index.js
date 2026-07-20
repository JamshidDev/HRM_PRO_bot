import { createConversation } from "@grammyjs/conversations"
import {registerConversation} from "./registerConversation.js"
import {otpConversation} from "./otpConversation.js"
import {
    mainConversation,
    myServiceConversation,
    mySalaryConversation,
    turniketConversation,
    selectDateConversation,
} from "./generalConversation.js"


export function registerConversations(composer) {
    composer.use(createConversation(registerConversation))
    composer.use(createConversation(mainConversation))
    composer.use(createConversation(myServiceConversation))
    composer.use(createConversation(mySalaryConversation))
    composer.use(createConversation(turniketConversation))
    composer.use(createConversation(selectDateConversation))
    composer.use(createConversation(otpConversation))

}
