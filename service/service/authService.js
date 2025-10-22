import axios from "../index.js"
const checkUserInfo =async (payload)=>{
    try{
        const {data} =  await axios.get(`/v1/telegram/${payload.id}`, {params:payload?.params})
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }

}
const checkRegisterUser =async (payload)=>{
    try{
        const {data} =  await axios.post(`/v1/telegram/check`,payload?.data)
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }

}
const registerUser =async (payload)=>{
    try{
        const {data} = await axios.post(`/v1/telegram/register`, payload?.data)
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }
}
const deleteUser =async (payload)=>{
    try{
        const {data} = await axios.delete(`/v1/telegram/${payload.id}`)
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
const loginSystem =async ()=>{
    try{
        const {data} =  await axios.post(`/auth/login`, {phone:977226656, password:'YFhwRUxYsaSs'})
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }

}
const getUsers =async (payload)=>{
    try{
        const {data} =  await axios.get(`/v1/admin/telegram/bot/users`, {
            params:payload?.params,
            headers:{ "Authorization":'Bearer '+payload.token }})
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }

}

const detachUsers =async (payload)=>{
    try{
        const {data} =  await axios.post(`/v1/admin/telegram/bot/users-detach`, payload?.data, {
            headers:{ "Authorization":'Bearer '+payload.token }
        })
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }

}

const setService =async (payload)=>{
    try{
        const {data} =  await axios.post(`/v1/telegram/menu/set-service`, payload?.data, {
            headers: payload?.uuid
                ? { "Uuid": payload.uuid }
                : undefined})
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
    loginSystem,
    getUsers,
    detachUsers,
    setService,
}