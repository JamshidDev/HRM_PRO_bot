import {Keyboard, InlineKeyboard} from "grammy"

const mainKeyboard =(ctx)=>{
    const keyboard = new Keyboard()
        .text(ctx.t('ProfileBtn'))
        .text(ctx.t('ServiceBtn'))
        .row()
        .text(ctx.t('TurniketBtn'))
        .text(ctx.t('logOutBtn'))
        .row()
        .text(ctx.t('OtpMenuBtn'))
        .row()
        .text(ctx.t('SupportBtn'))
        .row()
    if(ctx.config.isAdmin){
        keyboard.text(ctx.t('broadcastMessage'))
    }

    keyboard.resized()
    return keyboard

}

const phoneKeyboard = (t)=>{
    return new Keyboard()
        .requestContact(t('sendPhoneNumber'))
        .resized()
}



const cancelOperationKeyboard = (t)=>{
    return new Keyboard()
        .text(t('cancelOperation'))
        .resized()
}

const loginKeyboard = (t)=>{
    return new Keyboard()
        .text(t('loginBtn'))
        .resized()
}

const broadcastMsgKeyboard = (t)=>{
    return new Keyboard()
        .text(t('technicalMsgMenu'))
        .row()
        .text(t('salaryMsgMenu'))
        .row()
        .text(t('customMsgMenu'))
        .row()
        .text(t('backToMainMenu'))
        .resized()
}

const yesOrNoKeyboard = (t)=>{
    return new Keyboard()
        .text(t('yes'))
        .text(t('no'))
        .resized()
}

const otpKeyboard = (t, code)=>{
    return new InlineKeyboard()
        .copyText(t('otpCopyBtn'), code)
        .text(t('otpResendBtn'), 'otp_resend')
}


export default  {
    mainKeyboard,
    phoneKeyboard,
    loginKeyboard,
    yesOrNoKeyboard,
    broadcastMsgKeyboard,
    cancelOperationKeyboard,
    otpKeyboard,
}