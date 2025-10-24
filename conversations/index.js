import { createConversation } from "@grammyjs/conversations"
import {registerConversation} from "./registerConversation.js"
import {
    mainConversation,
    myServiceConversation,
    mySalaryConversation,
    adminMsgConversation,
    uploadImageConversation,
    verifiedTrunstileImageConversation,
    processTrunstileImageConversation,
    turniketConversation,
    selectDateConversation,
} from "./generalConversation.js"


export function registerConversations(composer) {
    composer.use(createConversation(registerConversation))
    composer.use(createConversation(mainConversation))
    composer.use(createConversation(myServiceConversation))
    composer.use(createConversation(mySalaryConversation))
    composer.use(createConversation(adminMsgConversation))
    composer.use(createConversation(uploadImageConversation))
    composer.use(createConversation(verifiedTrunstileImageConversation))
    composer.use(createConversation(processTrunstileImageConversation))
    composer.use(createConversation(turniketConversation))
    composer.use(createConversation(selectDateConversation))

}
