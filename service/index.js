import axios from 'axios'
import dotenv from "dotenv"
dotenv.config()
const apiUrl = process.env.SERVICE_URL
const TOKEN = process.env.API_TOKEN

const instance = axios.create({
    baseURL: `${apiUrl}/api`
})




instance.interceptors.request.use(function (config) {
    config.headers['Accept-Language'] = 'uz'
    config.headers['Access-Control-Allow-Origin'] = '*'
    config.headers['Bot-Token'] = TOKEN
    return config;
})

export default instance