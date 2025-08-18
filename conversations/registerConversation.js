
export async function registerConversation(conversation, ctx){
    await ctx.reply("Parolni kiriting")
    const password = await conversation.waitFor(":text")
    await ctx.reply("Loginni kiriting")
    const login = await conversation.waitFor(":text");
    await ctx.reply(`
LOGIN: ${login}
PASSWORD: ${password}
    `)
}