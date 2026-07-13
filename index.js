require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// قاعدة بيانات وهمية في الذاكرة لتخزين الرصيد (ملاحظة: عند إعادة تشغيل البوت يتصفر الرصيد، يفضل مستقبلاً ربطه بملف json أو قاعدة بيانات)
const userBalances = new Map();

// عند تشغيل البوت
client.once('ready', () => {
    console.log(`✅ تم تشغيل البوت بنجاح باسم: ${client.user.tag}`);
    client.user.setActivity('سيرفر TW', { type: 3 }); // Watching
});

// 1. نظام زيادة الرصيد تلقائياً مع تفاعل الشات
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // زيادة رصيد تفاعل عشوائي بين 1 إلى 5 نقاط عند كل رسالة
    const currentBalance = userBalances.get(message.author.id) || 0;
    const randomEarn = Math.floor(Math.random() * 5) + 1;
    userBalances.set(message.author.id, currentBalance + randomEarn);

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // أمر إرسال لوحة التذاكر (مثال: !setup-tickets)
    if (message.content === '!setup-tickets') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
        }

        const ticketEmbed = new EmbedBuilder()
            .setColor('#2F3136')
            .setTitle('تذاكر دعم فني 🎫')
            .setDescription('مرحباً بكم جميعاً في قسم تذاكر، لفتح تذكرة أرجو ضغط على قائمة أدناه واختيار التذكرة اللذي تتناسب مع مشكلتك.')
            .setImage('https://i.imgur.com/your-tickets-support-banner.png') // استبدل الرابط برابط بنر التذاكر الخاص بك
            .setThumbnail(message.guild.iconURL({ dynamic: true }));

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_select')
                    .setPlaceholder('📬 ...اختر القسم المناسب')
                    .addOptions([
                        {
                            label: 'الدعم الفني العام',
                            description: 'للمشاكل العامة داخل السيرفر',
                            value: 'general_support',
                            emoji: '🛠️',
                        },
                        {
                            label: 'قسم الشكاوى والإبلاغات',
                            description: 'للإبلاغ عن عضو أو مشكلة مع الإدارة',
                            value: 'report_support',
                            emoji: '🚨',
                        },
                        {
                            label: 'قسم الشراكات والتعاون',
                            description: 'لطلب شراكة أو إعلانات',
                            value: 'partners_support',
                            emoji: '🤝',
                        }
                    ]),
            );

        await message.channel.send({ embeds: [ticketEmbed], components: [selectMenu] });
        return message.delete().catch(() => {});
    }

    // أمر المحفظة المالية (!balance) المصمم مثل الصورة تماماً
    if (message.content.startsWith('!balance') || message.content.startsWith('!wallet')) {
        const targetUser = message.mentions.users.first() || message.author;
        const balance = userBalances.get(targetUser.id) || 0;

        const walletEmbed = new EmbedBuilder()
            .setColor('#1F2022')
            .setAuthor({ 
                name: `المحفظة المالية لـ ${targetUser.username}.`, 
                iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription(`💰 **رصيدك الحالي:**\n\n\` ${balance} TW \``)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 })) // يظهر الصورة المصغرة على اليمين كالصورة المرفقة
            .setFooter({ text: 'استمر في التفاعل لزيادة رصيدك من العملة!' });

        return message.reply({ embeds: [walletEmbed] });
    }

    // 2. أمر التحذير في الخاص (!warn @user Reason)
    if (command === 'warn') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ لا تمتلك صلاحية إدارة الرسائل لاستخدام هذا الأمر.');
        }

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ يرجى منشن العضو المراد تحذيره. مثال: `!warn @user سبب المخالفة`');

        const reason = args.slice(1).join(' ') || 'لم يتم تحديد سبب.';

        try {
            const warnEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚠️ تنبيه رسمي من إدارة السيرفر')
                .setDescription(`لقد تلقيت تحذيراً في سيرفر **${message.guild.name}**.\n\n**السبب:** ${reason}`)
                .setTimestamp();

            await member.send({ embeds: [warnEmbed] });
            return message.reply(`✅ تم إرسال التحذير بنجاح إلى الخاص الخاص بالعضو ${member}.`);
        } catch (error) {
            return message.reply(`❌ لم أتمكن من إرسال رسالة خاصة للعضو ${member} (قد تكون رسائله الخاصة مغلقة).`);
        }
    }

    // 3. أمر التايم أوت / وقت مستقطع (!timeout @user minutes Reason)
    if (command === 'timeout' || command === 'mute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ لا تمتلك صلاحية إدارة الأعضاء لإعطاء وقت مستقطع.');
        }

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ يرجى تحديد العضو. مثال: `!timeout @user 10 سبب الكتم` (الدقائق اختيارية، الافتراضي 10 دقائق)');

        const durationInput = parseInt(args[1]);
        const duration = isNaN(durationInput) ? 10 * 60 * 1000 : durationInput * 60 * 1000; // تحويل الدقائق إلى ميلي ثانية
        const reason = args.slice(2).join(' ') || 'لم يتم تحديد سبب.';

        if (!member.moderatable) {
            return message.reply('❌ لا يمكنني معاقبة هذا العضو (رتبته أعلى مني أو مماثلة).');
        }

        try {
            await member.timeout(duration, reason);
            
            // إرسال رسالة في الخاص لإبلاغه بالتايم
            const pmEmbed = new EmbedBuilder()
                .setColor('#FF3333')
                .setTitle('⏱️ تم اتخاذ إجراء وقت مستقطع (Timeout) بحقك')
                .setDescription(`تم وضعك في حالة وقت مستقطع في سيرفر **${message.guild.name}**.\n**المدة:** ${duration / 60000} دقيقة.\n**السبب:** ${reason}`);
            
            await member.send({ embeds: [pmEmbed] }).catch(() => console.log('تعذر إرسال الخاص للعضو المخالف.'));

            return message.reply(`✅ تم إعطاء وقت مستقطع بنجاح لـ ${member} لمدة ${duration / 60000} دقيقة. السبب: ${reason}`);
        } catch (error) {
            console.error(error);
            return message.reply('❌ حدث خطأ أثناء محاولة تنفيذ التايم أوت.');
        }
    }
});

// تفاعل قائمة اختيار التذكرة وإنشائها
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === 'ticket_select') {
        const categoryName = interaction.values[0];
        const guild = interaction.guild;
        const member = interaction.member;

        // منع فتح أكثر من تذكرة لنفس الشخص بقنوات مفتوحة
        const channelName = `ticket-${member.user.username.toLowerCase()}`;
        const existingChannel = guild.channels.cache.find(ch => ch.name === channelName);
        if (existingChannel) {
            return interaction.reply({ content: `❌ لديك تذكرة مفتوحة بالفعل هنا: ${existingChannel}`, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        // تحديد اسم القسم المختار ونوعه
        let friendlyCategoryName = "دعم فني";
        if (categoryName === 'general_support') friendlyCategoryName = "عام";
        if (categoryName === 'report_support') friendlyCategoryName = "بلاغ";
        if (categoryName === 'partners_support') friendlyCategoryName = "شراكة";

        try {
            // إنشاء القناة وتحديد صلاحيات الرؤية فقط لصاحب التذكرة والإدارة
            const ticketChannel = await guild.channels.create({
                name: `ticket-${member.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel], // إخفاء عن الجميع
                    },
                    {
                        id: member.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory], // إظهار للعضو
                    },
                ],
            });

            // إرسال بنر ورسالة الترحيب داخل التذكرة
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`مرحباً بك في تذكرة الدعم الفني (${friendlyCategoryName})`)
                .setDescription(`مرحباً يا ${member}، يرجى كتابة مشكلتك بالتفصيل وسيقوم فريق الإدارة بالرد عليك في أقرب وقت ممكن.`)
                .setTimestamp();

            const closeButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('إغلاق التذكرة 🔒')
                    .setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ content: `${member} | <@&إيدي_رتبة_الدعم>`, embeds: [welcomeEmbed], components: [closeButton] });

            return interaction.editReply({ content: `✅ تم فتح تذكرتك بنجاح في القناة: ${ticketChannel}` });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: '❌ حدث خطأ أثناء إنشاء التذكرة، تأكد من صلاحيات البوت.' });
        }
    }
});

// تفاعل زر إغلاق التذكرة
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'close_ticket') {
        const channel = interaction.channel;
        
        await interaction.reply({ content: '⏳ سيتم إغلاق التذكرة وحذف القناة بعد 5 ثوانٍ...' });

        setTimeout(async () => {
            try {
                await channel.delete();
            } catch (err) {
                console.error('تعذر حذف قناة التذكرة:', err);
            }
        }, 5000);
    }
});

client.login(process.env.DISCORD_TOKEN);
