# Xato loglari — @hrm_logger_bot → guruh "Bot" topic'i

Botdagi har qanday muammo `@hrm_logger_bot` orqali guruhdagi **Bot** topic'iga
yuboriladi: kim, qachon, qaysi amalda, qanday xato — traceback bilan.

## 1. Sozlash

### 1.1 Logger botni guruhga qo'shish

1. `@hrm_logger_bot`ni guruhga qo'shib, **admin** qiling (topic'ga yozish uchun kerak).
2. `@BotFather` → `/setprivacy` → **Disable** — aks holda guruhdagi xabarlar
   `getUpdates`ga tushmaydi va quyidagi qadamda ID'larni ko'ra olmaysiz.

### 1.2 `LOG_CHAT_ID` va `LOG_THREAD_ID` ni topish

Guruhning **Bot** topic'iga ixtiyoriy xabar yozing (masalan `/start`), so'ng:

```bash
curl -s "https://api.telegram.org/bot<LOGGER_BOT_TOKEN>/getUpdates" | python3 -m json.tool
```

Javobdan oling:

| Kerakli qiymat | JSON yo'li |
|---|---|
| `LOG_CHAT_ID` | `result[].message.chat.id` (forum guruhda `-100...`) |
| `LOG_THREAD_ID` | `result[].message.message_thread_id` |

> **Diqqat:** guruhning **General** topic'ida `message_thread_id` bo'lmaydi.
> Xabarni aynan **Bot** nomli topic'ga yozing.

Tekshirish:

```bash
curl -s "https://api.telegram.org/bot<LOGGER_BOT_TOKEN>/sendMessage" \
  -d chat_id=<LOG_CHAT_ID> -d message_thread_id=<LOG_THREAD_ID> -d text="test"
```

Xabar aynan "Bot" topic'ida chiqsa — manzil to'g'ri.

### 1.3 `.env` fayliga yozish

```env
LOGGER_BOT_TOKEN=123456:AA...
LOG_CHAT_ID=-1001234567890
LOG_THREAD_ID=42
LOG_ENV=prod
```

`LOGGER_BOT_TOKEN` yoki `LOG_CHAT_ID` bo'sh bo'lsa logger **o'chib qoladi**:
ishga tushganda bitta ogohlantirish chiqadi, xatolar esa faqat konsolga
yoziladi. Lokal ishlab chiqishda shu holat normal — hech narsa sozlash shart emas.

## 2. Nima yuboriladi

| Manba | Scope | Fayl |
|---|---|---|
| Handler'lardagi kutilmagan xatolar | `bot.catch · ...` | `server.js` |
| Ushlanmagan promise/exception | `unhandledRejection`, `uncaughtException` | `server.js` |
| Har qanday `console.error` | `console.error` | `utils/logger.js` (perexvat) |
| HRM backend API xatolari (status, URL, body) | `api` | `service/index.js` |
| Handler ichidagi jim yutilgan xatolar (user konteksti bilan) | `servicesUser`, `oylik/hisobot`, `profil`, … | composer / conversations |
| Bot ishga tushdi / to'xtadi / polling uzildi | — (hodisa xabari) | `server.js` |

**Yuborilmaydi:**

- Telegram'ning normal "xato"lari — `message is not modified`, `query is too old`
  va h.k. (`server.js`dagi `IGNORABLE` ro'yxati).
- `GET /v1/telegram/auth/{id}` → `404` — ro'yxatdan o'tmagan userda har safar
  chiqadigan normal holat (`service/index.js`dagi `EXPECTED` ro'yxati).

## 3. Spamdan himoya

- **Deduplikatsiya.** Xato "barmoq izi" (scope + turi + kodi + raqamlari
  tozalangan matni + stack'ning 1-frame'i) bo'yicha guruhlanadi. Bir xil xato
  `LOG_DEDUP_WINDOW_MS` (default 5 daqiqa) ichida **bir marta** yuboriladi;
  keyingi xabarda `🔁 oxirgi 5 daqiqada N marta` qatori ko'rinadi.
- **Rate limit.** Daqiqada `LOG_MAX_PER_MIN` (default 20) xabardan oshsa
  qolganlari tashlanadi va oyna bo'shashi bilan bitta
  `⏳ N ta xabar rate limit tufayli tashlandi` xulosasi keladi.
- **Tokenlar yashiriladi** — xabar matnidagi `BOT_TOKEN`/`LOGGER_BOT_TOKEN`
  qiymatlari `***` ga almashtiriladi.

## 4. `NOTIFICATION_ID` bilan farqi

`NOTIFICATION_ID` — bu logger emas. U faqat bitta holatda ishlatiladi:
foydalanuvchi botni bloklaganda backend'dan o'chirish so'rovi xato bersa,
o'sha chat'ga xabar boradi (`composer/configComposer.js`). Umumiy xato
loglari esa har doim `LOG_CHAT_ID` + `LOG_THREAD_ID`ga tushadi.

## 5. Loggerni o'chirish

`LOGGER_BOT_TOKEN` (yoki `LOG_CHAT_ID`) ni bo'sh qoldirish kifoya — kod
o'zgartirish shart emas. Faqat `console.error` perexvatini o'chirish kerak
bo'lsa: `LOG_CONSOLE_ERRORS=false`.

## 6. Test uchun ilgak

`LOG_API_ROOT` — xabarlar Telegram o'rniga ko'rsatilgan manzilga yuboriladi.
Real token'siz xabar formatini tekshirish uchun:

```bash
LOG_API_ROOT=http://127.0.0.1:8791 LOGGER_BOT_TOKEN=1:FAKE LOG_CHAT_ID=-1 \
  node -e "import('./utils/logger.js').then(m => m.reportError(new Error('test'), {scope:'sinov'}))"
```

Prod'da bu o'zgaruvchi **sozlanmasligi kerak**.
