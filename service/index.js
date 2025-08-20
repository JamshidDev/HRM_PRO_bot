import axios from 'axios'
let userId = null
const apiUrl = 'http://192.168.136.78:8004'
const TOKEN = '7391739713:AAE4LE7CcswBKuZt_FnjBWCFuhN4sl3fH58'

const instance = axios.create({
    baseURL: `${apiUrl}/api`
})

export const setUserId = (id)=>{
    userId = id
}



instance.interceptors.request.use(function (config) {
    if (userId) {
        config.headers["Uuid"] = userId
    }
    config.headers['Accept-Language'] = 'uz'
    config.headers['Access-Control-Allow-Origin'] = '*'
    config.headers['Bot-Token'] = TOKEN
    return config;
})

export default instance