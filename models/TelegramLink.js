import mongoose from "mongoose"

const telegramLinkSchema = new mongoose.Schema({
  uuid:   { type: String, required: true, unique: true, index: true },
  chatId: { type: Number, required: true },
}, { timestamps: true })

export default mongoose.model("TelegramLink", telegramLinkSchema)
