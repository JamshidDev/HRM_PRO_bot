import {Worker, isMainThread, parentPort, workerData} from "worker_threads"
import {Bot} from "grammy"
import dotenv from "dotenv"
import {authService} from "../service/service/index.js"
import {noteLogger} from "../utils/helper.js"
import {a} from "@grammyjs/parse-mode"

//  templateId
// 0 - appFeatureMessageTemplate
// 1 - happyBirthdayMessageTemplate

//  userId
// 0 - all users
// 1 - birthday users

dotenv.config()

const TOKEN = process.env.BOT_TOKEN
const notificationId = process.env.NOTIFICATION_ID
const workers = []
export async function stopAllWorkers() {
    await Promise.all(workers.map(w => w.terminate()))
    console.log("✅ All workers stopped")
}

const getTokenByAuth =async()=>{
    const [response, error] = await authService.loginSystem()
    if (error) return {status: false, token: null, msg: error?.message}
    return {
        status: true,
        token: response.access_token,
        msg: null,
    }
}

const loginAndGetAllUsers = async (bot,birthday=false) => {
    const response = await getTokenByAuth()
    if (!response.status) return {status: false, data: [], msg: response.msg}
    const token = response.token
    const [response2, error2] = await authService.getUsers({token, params:{birthdays:birthday || undefined, page:1,per_page:1000 }})
    if (error2) return {status: false, data: [], msg: error2?.message}
    return {
        status: true,
        data: response2.data.data,
        msg: null,
    }
}

export  const initialBroadcastMsg = async (bot,userId, templateId,)=>{
    let birthday = userId === 1
    const response = await loginAndGetAllUsers(bot,birthday)
    if (!response.status) {
        await noteLogger(bot, "Bazadan userlarni olib kelishda xatolik yuz berdi", response.msg,)
        return
    }

    // const users = response.data
    const users = [{
        "id": 2,
        "user": {
            "id": 4417,
            "uuid": "60ed7bfd-45f5-4cc4-a867-4c16347d2b33",
            "worker": {
                "id": 4746,
                "photo": null,
                "last_name": "Ro‘ziqulova",
                "first_name": "Farzona",
                "middle_name": "Xamza qizi"
            },
            "phone": 999889742
        },
        "chat_id": 1038293334,
        "phone": 999889742
    },
        {
            "id": 3,
            "user": {
                "id": 41574,
                "uuid": "9687785c-75db-4386-8960-984e34c1595c",
                "worker": {
                    "id": 42774,
                    "photo": null,
                    "last_name": "Amrulloyev",
                    "first_name": "Anvarjon",
                    "middle_name": "Shuxrat o'g'li"
                },
                "phone": 904434167
            },
            "chat_id": 5011373330,
            "phone": 904434167
        },]
    await noteLogger(bot, null, "Xabar yuborish jarayoni boshlandi...",false)
    const worker = new Worker('./workers/workerOne.js', {
        workerData: {users,templateId},
    })




    worker.on("message", async (msg) => {
        if (msg.type === 'success') {
            const response = await getTokenByAuth()
            if(!response.status){
                await noteLogger(bot, "Login qilishda xatolik yuz berdi.", response.msg,)
            }
            const token = response.token

            const successUsers = msg.data.messagedUsersList
            const rejectedUsers = msg.data.rejectedUsersList

            const data = {
                chat_ids:successUsers,
            }
            const [_, error] = await authService.detachUsers({data, token})
            if(error){
                await noteLogger(bot, "User deattachda xatolik yuz berdi...", error?.message,)
            }

            await bot.api.sendMessage(notificationId,`
<i>Xabar tarqatish yakunlandi</i>

✅ Yuborildi: <b>${successUsers.length}</b>
🚫 Block:<b>${rejectedUsers.length}</b>
`, {parse_mode: "HTML"})
        }
    })

    worker.on("exit", (code) => {
        console.log(`Error kod: ${code}`)
    })
}




async function appFeatureMessageTemplate(bot, data){
    await bot.api.sendMessage(data.chat_id, `
<b>📢 Xurmatli foydalanuvchi 📢</b>    

<i>🛠 Bot faoliyatida kuzatilgan texnik nosozliklar bartaraf etildi. 
Hozirda tizim to‘liq ish rejimida ishlamoqda.</i>

<i>Botdan foydalanishni davom ettirish uchun /start buyrug‘ini bosing.</i>

`, {parse_mode: "HTML",})

}
async function happyBirthdayMessageTemplate(bot, data){
    await bot.api.sendMessage(data.chat_id, `
<b>🎉 Tug‘ilgan kuningiz muborak! 🎉</b>    

Hurmatli ${data?.user?.worker?.last_name || ''} ${data?.user?.worker?.first_name || ''},

<i>Sizni bugungi qutlug‘ tug‘ilgan kuningiz bilan samimiy muborakbod etamiz!
Yangi yoshingiz hayotingizga sihat-salomatlik, quvonch va farovonlik olib kelsin.
Ishlaringizda ulkan muvaffaqiyatlar, hayot yo‘lingizda esa baxt va omad yor bo‘lishini tilaymiz. 🌺
</i>

Hurmat bilan,
<b>O'zbekiston temir yo'llari AJ</b>

`, {parse_mode: "HTML",})

}










if(!isMainThread){
    const callback =  workerData?.templateId === 0 ? appFeatureMessageTemplate : happyBirthdayMessageTemplate
    await runBroadcastWorker(workerData?.users, callback)
}

async function runBroadcastWorker(users, callback) {
    const rejectedUsersList = []
    const messagedUsersList = []
    const bot = new Bot(TOKEN)

    const BATCH_SIZE = 20
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
        try {
            const batch = users.slice(i, i + BATCH_SIZE)
            const results = await Promise.allSettled(
                batch.map(async (user) => {
                    return callback(bot, user)
                })
            )

            results?.forEach((result, index) => {
                const user = users[index]
                if (result.status === "fulfilled") {
                    messagedUsersList.push(user.chat_id)
                } else if (result.status === "rejected") {
                    rejectedUsersList.push(user.chat_id)
                    parentPort.postMessage({
                        type: "error",
                        error: result.reason?.description || result.reason?.message || "Unknown error",
                    })
                }

            })
            await new Promise((res) => setTimeout(res, 3000))

        } catch (error) {
            console.log(error)
            parentPort.postMessage({
                type: "error",
                error: error.message,
            })
        }


    }
    parentPort.postMessage({
        type: "success",
        data: {
            messagedUsersList,
            rejectedUsersList,
        },
        error: null,
    })
    parentPort.close()
}

