import axios from 'axios'
import dotenv from "dotenv"
dotenv.config()
let userId = null
const apiUrl = process.env.SERVICE_URL
const TOKEN = process.env.BOT_TOKEN

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