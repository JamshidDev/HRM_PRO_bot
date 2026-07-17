import axios from "../index.js"
const checkUserInfo =async (payload)=>{
    try{
        const {data} =  await axios.get(`/v1/telegram/auth/${payload.id}`, {params:payload?.params})
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }

}
const checkRegisterUser =async (payload)=>{
    try{
        const {data} =  await axios.post(`/v1/telegram/auth/check`,payload?.data)
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }

}
const registerUser =async (payload)=>{
    try{
        const {data} = await axios.post(`/v1/telegram/auth/register`, payload?.data)
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }
}
const deleteUser =async (payload)=>{
    try{
        const {data} = await axios.delete(`/v1/telegram/auth/${payload.id}`)
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }
}
const servicesUser =async (payload)=>{
    try{
        const {data} =  await axios.get(`/v1/telegram/menu/services`,
            {params:payload?.params,
             headers: payload?.uuid
                    ? { "Uuid": payload.uuid }
                    : undefined
            })
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }

}
const getServices =async (payload)=>{
    try{
        const {data} =  await axios.get(`/v1/telegram/menu/get-service`, {
            params:payload?.params,
            headers: payload?.uuid
                ? { "Uuid": payload.uuid }
                : undefined})
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }

}
// Bot broadcast ro'yxati — Bot-Token bilan (login/Bearer KERAK EMAS).
// Bot-Token axios interceptor'da global qo'shiladi (service/index.js).
const getBotUsers =async (payload)=>{
    try{
        const {data} =  await axios.get(`/v1/telegram/bot/users`, {params:payload?.params})
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }
}

const detachBotUsers =async (payload)=>{
    try{
        const {data} =  await axios.post(`/v1/telegram/bot/users-detach`, payload?.data)
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }
}

const getProfile =async (payload)=>{
    try{
        const {data} =  await axios.get(`/v1/telegram/profile`, {
            params:payload?.params,
            headers: payload?.uuid
                ? { "Uuid": payload.uuid }
                : undefined})
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }

}

const generateOtp =async (payload)=>{
    try{
        const {data} = await axios.get(`/v1/telegram/get-otp`, {params: payload?.params})
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }

}






export const authService = {
    checkUserInfo,
    checkRegisterUser,
    registerUser,
    deleteUser,
    servicesUser,
    getServices,
    getBotUsers,
    detachBotUsers,
    setService,
    getProfile,
    generateOtp,
}