import axios from 'axios'
import dotenv from "dotenv"
import { reportError } from "../utils/logger.js"

dotenv.config({quiet: true})
const apiUrl = process.env.SERVICE_URL
const TOKEN = process.env.BOT_TOKEN

const instance = axios.create({
    baseURL: `${apiUrl}/api`,
    // Timeout'siz so'rov backend javob bermasa abadiy osilib qoladi: user
    // "Kuting..." bilan qolib ketadi va logger ham hech narsa ko'rmaydi.
    timeout: 15000,
})




instance.interceptors.request.use(function (config) {
    config.headers['Accept-Language'] = 'uz'
    config.headers['Access-Control-Allow-Origin'] = '*'
    config.headers['Bot-Token'] = TOKEN
    return config;
})

// Normal ish oqimining bir qismi bo'lgan javoblar — bularni logger botga
// yuborish shovqin bo'ladi. auth/{id} 404: user hali ro'yxatdan o'tmagan,
// bu har bir yangi foydalanuvchida chiqadi (configComposer'dagi auth tekshiruvi).
// `message` — ixtiyoriy: berilsa javob tanasidagi message ham mos kelishi shart.
// Shu tufayli bitta status butunlay ko'r bo'lib qolmaydi.
const EXPECTED = [
    { method: 'get', pattern: /^\/v1\/telegram\/auth\/\d+$/, status: 404 },

    // Ro'yxatdan o'tishda kiritilgan telefon/JSHSHIR HRM tizimida topilmasa
    // backend 400 qaytaradi. Bu har bir noto'g'ri kiritishda takrorlanadigan
    // normal oqim — registerConversation.js:63 userga notFoundUser ko'rsatib,
    // qaytadan kirish tugmasini beradi. `message` sharti bor, ya'ni bu
    // endpoint'dagi BOSHQA 400'lar (masalan so'rov tanasi noto'g'ri) baribir
    // logger'ga tushadi.
    {
        method: 'post',
        pattern: /^\/v1\/telegram\/auth\/check$/,
        status: 400,
        message: /topilmadi yoki mavjud emas/i,
    },
]

const isExpected = (err) => {
    const status = err?.response?.status
    if (!status) return false
    const method = (err?.config?.method || '').toLowerCase()
    const url = (err?.config?.url || '').split('?')[0]
    const body = err?.response?.data
    const bodyMessage = typeof body?.message === 'string' ? body.message : ''
    return EXPECTED.some((e) =>
        e.status === status &&
        e.method === method &&
        e.pattern.test(url) &&
        (!e.message || e.message.test(bodyMessage))
    )
}

// Xatolar authService'da tuple'ga o'ralib yutiladi va bot.catch'gacha yetib
// bormaydi. Shu sababli xabar aynan shu yerda — bitta joyda — yuboriladi.
// Promise.reject(err) qaytariladi, ya'ni chaqiruvchilar uchun hech narsa
// o'zgarmaydi.
instance.interceptors.response.use(
    (response) => response,
    (err) => {
        if (!isExpected(err)) {
            // so'rov/status/body ni logger o'zi axios xatosidan ajratib oladi.
            reportError(err, { scope: 'api' })
        }
        return Promise.reject(err)
    }
)

export default instance
