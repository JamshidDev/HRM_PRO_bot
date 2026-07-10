import {authService} from "../service/service/index.js"

// TEMP MOCK — backend /v1/telegram/auth/otp/generate endpoint not built yet.
// Remove this block and uncomment the real call below once backend is ready.
export async function issueOtp({uuid, token, platform}) {
    console.log("TEMP MOCK issueOtp called with:", {uuid, token, platform})
    const code = Math.floor(100000 + Math.random()*900000).toString()
    return {
        ok:true,
        code,
        expiresAt: Date.now() + 180*1000,
    }
}

// export async function issueOtp({uuid, token, platform}) {
//     const [response, err] = await authService.generateOtp({uuid, data:{token, platform}})
//     if (err || !response?.data?.code) {
//         return {ok:false}
//     }
//     const expiresInSeconds = response.data.expires_in ?? 180
//     return {
//         ok:true,
//         code: response.data.code,
//         expiresAt: Date.now() + expiresInSeconds*1000,
//     }
// }
