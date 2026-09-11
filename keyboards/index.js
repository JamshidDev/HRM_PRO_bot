import {Keyboard, InlineKeyboard} from "grammy"

const mainKeyboard =(ctx)=>{
    const keyboard = new Keyboard()
        .text(ctx.t('ProfileBtn'))
        .text(ctx.t('logOutBtn'))
        .row()
        .text(ctx.t('OtpMenuBtn'))
        .row()
        .text(ctx.t('SupportBtn'))
        .row()
        .text(ctx.t('DownloadAppBtn'))
        .row()
        // Xizmatlar va Turniket tugmalari hozircha disabled

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

const yesOrNoKeyboard = (t)=>{
    return new Keyboard()
        .text(t('yes'))
        .text(t('no'))
        .resized()
}

const otpKeyboard = (t, code)=>{
    return new InlineKeyboard()
        .copyText(t('otpCopyBtn'), code)
        .row()
        .text(t('otpResendBtn'), 'otp_resend')
}

const downloadAppKeyboard = (t)=>{
    return new InlineKeyboard()
        .url(t('playMarketBtn'), 'https://play.google.com/store/apps/details?id=hrms.railway.uz')
        .row()
        .url(t('appStoreBtn'), 'https://apps.apple.com/us/app/hr-rail/id6759365016')
}


export default  {
    mainKeyboard,
    phoneKeyboard,
    loginKeyboard,
    yesOrNoKeyboard,
    cancelOperationKeyboard,
    otpKeyboard,
    downloadAppKeyboard,
}