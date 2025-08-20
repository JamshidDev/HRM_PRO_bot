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
        const {data} = await axios.delete(`/v1/telegram/users/${payload.id}`)
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }
}
const servicesUser =async (payload)=>{
    try{
        const {data} =  await axios.get(`/v1/telegram/menu/services`, {params:payload?.params})
        return [data, null]
    }catch (err){
        return [null, err.response?.data || err.message]
    }

}
const getServices =async (payload)=>{
    try{
        const {data} =  await axios.get(`/v1/telegram/menu/get-service`, {params:payload?.params})
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
}