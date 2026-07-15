import {authService} from "../service/service/index.js"

export async function issueOtp({chatId}) {
    const [response, err] = await authService.generateOtp({params: {chat_id: chatId}})
    if (err || !response?.data?.code) {
        return {ok: false}
    }
    const expiresInSeconds = response.data.expires_in ?? 180
    return {
        ok: true,
        code: response.data.code,
        expiresAt: Date.now() + expiresInSeconds * 1000,
    }
}
