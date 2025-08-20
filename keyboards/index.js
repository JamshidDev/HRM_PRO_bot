import {Keyboard} from "grammy"

const mainKeyboard =(t)=>{
    return new Keyboard()
        .text(t('ProfileBtn'))
        .text(t('ServiceBtn'))
        .row()
        .text(t('logOutBtn'))
        .text(t('SupportBtn'))
        .resized()
}

const phoneKeyboard = (t)=>{
    return new Keyboard()
        .requestContact(t('sendPhoneNumber'))
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



export default  {mainKeyboard, phoneKeyboard, loginKeyboard, yesOrNoKeyboard}