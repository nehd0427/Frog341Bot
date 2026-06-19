// Base Data 

const fs = require('fs');

function defaultServerData() {
    return {

    userClaims: {},

    userCooldowns: {},

        adc: {
            left: {
                owner: null,
                ownerId: null,
                tickets: 0,
                reserve: null,
                reserveId: null,
                reserveExpiresAt: null,
                expiresAt: null
            },
            center: {
                owner: null,
                ownerId: null,
                tickets: 0,
                reserve: null,
                reserveId: null,
                reserveExpiresAt: null,
                expiresAt: null
            },
            right: {
                owner: null,
                ownerId: null,
                tickets: 0,
                reserve: null,
                reserveId: null,
                reserveExpiresAt: null,
                expiresAt: null
            }
        },

        bossRotation: {
        owner: null,
        ownerId: null,
        tickets: 0,
        expiresAt: null
        },

        bosses: {
        leader1: {
           expiresAt: null
        },
        leader2: {
           expiresAt: null
        },
        leader3: {
           expiresAt: null
        },
        goldOre: {
          expiresAt: null
        },
        goldHerb: {
          expiresAt: null
        }
     }

  };
}

// Load Data

function loadData() {
    if (!fs.existsSync('data.json')) {
    const data = {
      channels: {}
    };

        fs.writeFileSync(
            'data.json',
            JSON.stringify(data, null, 2)
        );
    }

    try {

    return JSON.parse(
        fs.readFileSync('data.json')
    );

} catch (err) {

    console.error(
        '[DATA] data.json corrupted. Rebuilding.'
    );

    const data = {
        channels: {}
    };

    fs.writeFileSync(
        'data.json',
        JSON.stringify(data, null, 2)
    );

    return data;
}

}

function formatCooldown(ms) {

    const minutes =
        Math.floor(ms / 60000);

    const seconds =
        Math.floor((ms % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2,'0')}`;
}

function getCooldown(data, channelId, userId) {

    const expires =
        data.channels[channelId]
        ?.userCooldowns?.[userId];

    if (!expires) return null;

    if (Date.now() >= expires) {

        delete data.channels[channelId]
            .userCooldowns[userId];

        saveData(data);

        return null;
    }

    return expires;
}

async function addCooldown(
    data,
    channelId,
    userId
) {

    data.channels[channelId]
        .userCooldowns[userId] =
        Date.now() + (5 * 60 * 1000);

    await saveData(data);
}

// Save Data

let saveQueue =
    Promise.resolve();

function saveData(data) {

    saveQueue =
        saveQueue.then(() =>
            fs.promises.writeFile(
                'data.json',
                JSON.stringify(data, null, 2)
            )
        );

    return saveQueue;
}

async function sendAutoDelete(
    channel,
    content,
    ms = 1200000
) {

    const msg =
        await channel.send(content);

    console.log(
        `[AUTO DELETE CREATED] ${msg.id}`
    );

    setTimeout(async () => {

        try {

            await msg.delete();

            console.log(
                `[AUTO DELETE SUCCESS] ${msg.id}`
            );

        } catch (err) {

    if (err?.code === 10008) return;

    console.error(
        `[AUTO DELETE FAILED] ${msg.id}:`,
        err.message || err
    );
}

    }, ms);

    return msg;
}

// Create Bot

require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    PermissionFlagsBits
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// Login

client.once('clientReady', async () => {

    console.log(`Logged in as ${client.user.tag}`);

    const data = loadData();

    for (const channelId of Object.keys(data.channels || {})) {

    try {

        const channel =
            await client.channels.fetch(channelId);

        console.log(
            `[PANEL RESTORED] #${channel.name} | Message: ${data.channels[channelId].panelMessageId}`
        );

    } catch (err) {

        console.log(
            `[RESTORE FAILED] ${channelId}`
        );

    }
}

});

// UPDATEPANEL

async function updatePanel(channel) {

    const data = loadData();
    const channelId = channel.id;

    if (!data.channels[channelId]) return;

    const panelMessageId =
        data.channels[channelId].panelMessageId;

    const fetchedChannel =
        await channel.client.channels.fetch(channelId);

    let panelMessage;

try {

    panelMessage =
        await fetchedChannel.messages.fetch(panelMessageId);

} catch (err) {

    console.log(
        `[PANEL NOT FOUND] Removing stale panel for channel ${channelId}`
    );

    delete data.channels[channelId];

    await await saveData(data);
   
    return;
}
    const left =
        data.channels[channelId].adc.left;

    const center =
        data.channels[channelId].adc.center;

    const right =
        data.channels[channelId].adc.right;
    const bosses =
    data.channels[channelId].bosses;

if (!bosses.leader1 || typeof bosses.leader1 !== 'object')
    bosses.leader1 = { expiresAt: null };

if (!bosses.leader2 || typeof bosses.leader2 !== 'object')
    bosses.leader2 = { expiresAt: null };

if (!bosses.leader3 || typeof bosses.leader3 !== 'object')
    bosses.leader3 = { expiresAt: null };

if (!bosses.goldOre || typeof bosses.goldOre !== 'object')
    bosses.goldOre = { expiresAt: null };

if (!bosses.goldHerb || typeof bosses.goldHerb !== 'object')
    bosses.goldHerb = { expiresAt: null };

    const boss =
        data.channels[channelId].bossRotation;

    const occupied =
        [left, center, right]
        .filter(x => x.ownerId)
        .length;

    function getRemainingTime(expiresAt) {

    if (!expiresAt) return '--:--:--';

    const remaining =
        Math.max(0, expiresAt - Date.now());

    const hours =
        Math.floor(remaining / 3600000);

    const minutes =
        Math.floor((remaining % 3600000) / 60000);

    const seconds =
        Math.floor((remaining % 60000) / 1000);

    return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
}

function getBossStatus(boss) {

    if (!boss?.expiresAt) {
        return {
            icon: '🟢',
            text: 'Alive'
        };
    }

    if (Date.now() >= boss.expiresAt) {
        return {
            icon: '🟢',
            text: 'Alive'
        };
    }

    return {
        icon: '🔴',
        text: getRemainingTime(boss.expiresAt)
    };
}

    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🐸 青蛙・341')
        .setDescription('Claim a chamber using the button below.')

        .addFields(
        {
            name: 'ㅤADC STATUS',
            value: `🚦 ${occupied}/3 Occupied\n\u200B`,
            inline: false
        },

        {
            name: `${left.ownerId ? '🔴' : '🟢'} LEFT`,
            value:
`Status: ${left.ownerId ? 'OCCUPIED' : 'FREE'}
👤: ${left.owner || 'None'}
🎟: ${left.tickets}
⏰: ${getRemainingTime(left.expiresAt)}

📌 ${left.reserve || 'None'}`,
            inline: true
        },

        {
            name: `${center.ownerId ? '🔴' : '🟢'} CENTER`,
            value:
`Status: ${center.ownerId ? 'OCCUPIED' : 'FREE'}
👤: ${center.owner || 'None'}
🎟: ${center.tickets}
⏰: ${getRemainingTime(center.expiresAt)}

📌 ${center.reserve || 'None'}`,
            inline: true
        },

        {
            name: `${right.ownerId ? '🔴' : '🟢'} RIGHT`,
            value:
`Status: ${right.ownerId ? 'OCCUPIED' : 'FREE'}
👤: ${right.owner || 'None'}
🎟: ${right.tickets}
⏰: ${getRemainingTime(right.expiresAt)}

📌 ${right.reserve || 'None'}`,
            inline: true
        },

{
    name:
`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${boss.ownerId ? '🔴' : '🟢'} BOSS ROTATION`,
    value:
`👤: ${boss.owner || 'Free to Claim'}
⏰: ${getRemainingTime(boss.expiresAt)}

${getBossStatus(bosses.leader1).icon} Leader I - ${getBossStatus(bosses.leader1).text}
${getBossStatus(bosses.leader2).icon} Leader II - ${getBossStatus(bosses.leader2).text}
${getBossStatus(bosses.leader3).icon} Leader III - ${getBossStatus(bosses.leader3).text}
${getBossStatus(bosses.goldOre).icon} Gold Ore - ${getBossStatus(bosses.goldOre).text}
${getBossStatus(bosses.goldHerb).icon} Gold Herb - ${getBossStatus(bosses.goldHerb).text}

*⏱️ Panel updates every 15 seconds.*`,
    inline: false
   },
);

try {

    await panelMessage.edit({
        embeds: [embed]
    });

} catch (err) {

    if (err.code === 10008) {

        console.log(
            `[PANEL REMOVED] Cleaning stale panel for ${channelId}`
        );

        delete data.channels[channelId];
        await saveData(data);

        return;
    }

    throw err;
}

}

// INTERACTION SETUP BUTTONS

    client.on('interactionCreate', async interaction => {

    if (interaction.isButton()) {

    if (interaction.customId.startsWith('claim_end_')) {

        const ownerId =
            interaction.customId.replace(
                'claim_end_',
                ''
            );

        if (interaction.user.id !== ownerId) {

            return interaction.reply({
                content:
                    '❌ This claim belongs to another user.',
                flags: 64
            });
        }

        interaction.customId = 'endclaim';
    }

    if (interaction.customId.startsWith('claim_swap_')) {

        const ownerId =
            interaction.customId.replace(
                'claim_swap_',
                ''
            );

        if (interaction.user.id !== ownerId) {

            return interaction.reply({
                content:
                    '❌ This claim belongs to another user.',
                flags: 64
            });
        }

        interaction.customId = 'swapclaim';
    }

    if (interaction.customId === 'claim') {

        const data = loadData();
        const channelId = interaction.channel.id;

        if (!data.channels[channelId]) {
    return interaction.reply({
        content: 'Panel not initialized.',
       flags: 64
    });
}

const userId = interaction.user.id;

const cooldown =
    getCooldown(
        data,
        channelId,
        userId
    );

if (cooldown) {

    return interaction.reply({
        content:
`❌ You are on cooldown (${formatCooldown(cooldown - Date.now())})`,
        flags: 64
    });
}

if (!data.channels[channelId].userClaims) {
    data.channels[channelId].userClaims = {};
}

if (!data.channels[channelId].userCooldowns) {
    data.channels[channelId].userCooldowns = {};
}

let existingClaim =
    data.channels[channelId].userClaims[userId];

if (!existingClaim) {

    const adcOwned = Object.values(
        data.channels[channelId].adc
    ).find(
        spot => spot.ownerId === userId
    );

    if (adcOwned) {
        existingClaim = {
    type: `ADC ${Object.keys(data.channels[channelId].adc)
        .find(key =>
            data.channels[channelId].adc[key].ownerId === userId
        )
        .toUpperCase()}`
       };

    }
}

if (existingClaim) {

    return interaction.reply({
        content:
`❌ You already own ${existingClaim.type}. Use your claim panel.`,
        flags: 64
    });
}

const reservedSpot =
    Object.keys(data.channels[channelId].adc)
    .find(key => {

        const adc =
            data.channels[channelId].adc[key];

        return (
            adc.reserveId === userId &&
            adc.reserveExpiresAt &&
            Date.now() < adc.reserveExpiresAt
        );
    });

if (reservedSpot) {

    const ticketMenu =
        new StringSelectMenuBuilder()
        .setCustomId(`tickets_${reservedSpot}`)
        .setPlaceholder('Select Ticket Count')
        .addOptions(
            { label: '1 Ticket (30 mins)', value: '1' },
            { label: '2 Tickets (1 hr)', value: '2' },
            { label: '3 Tickets (1 hr 30 mins)', value: '3' },
            { label: '4 Tickets (2 hrs)', value: '4' },
            { label: '5 Tickets (2 hrs 30 mins)', value: '5' },
            { label: '6 Tickets (3 hrs)', value: '6' }
        );

    const row =
        new ActionRowBuilder()
        .addComponents(ticketMenu);

    return interaction.reply({
        content:
            `📌 Priority Claim for ADC ${reservedSpot.toUpperCase()}`,
        components: [row],
        flags: 64
    });
}

const chamberMenu =
new StringSelectMenuBuilder()
.setCustomId('claimtype')
.setPlaceholder('Select Chamber Type')
.addOptions(
{
    label: 'ADC',
    value: 'adc'
},
{
    label: 'Boss Rotation',
    value: 'boss'
}
);

const menuRow =
new ActionRowBuilder()
.addComponents(chamberMenu);

await interaction.reply({
    content: 'Select Chamber Type',
    components: [menuRow],
    flags: 64
});
    }

if (interaction.customId === 'endclaim') {

    const data = loadData();
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    const claim =
        data.channels[channelId]
        .userClaims[userId];

    if (claim?.claimPanelMessageId) {

    try {

        const msg =
            await interaction.channel.messages.fetch(
                claim.claimPanelMessageId
            );

        await msg.delete();

    } catch {}
}

    if (!claim) {

        return interaction.reply({
            content: 'No active claim found.',
            flags: 64
        });
    }

if (claim.chamberType === 'boss') {

    const boss =
        data.channels[channelId].bossRotation;

    boss.owner = null;
    boss.ownerId = null;
    boss.tickets = 0;
    boss.expiresAt = null;

    delete data.channels[channelId].userClaims[userId];

  // HARDCLEANUP
    Object.values(data.channels[channelId].adc).forEach(adc => {

        if (adc.reserveId === userId) {
            adc.reserve = null;
            adc.reserveId = null;
            adc.reserveExpiresAt = null;
        }

        if (adc.ownerId === userId) {
            adc.owner = null;
            adc.ownerId = null;
            adc.tickets = 0;
            adc.expiresAt = null;
        }
    });

    await saveData(data);

    await updatePanel(interaction.channel);

    return interaction.reply({
        content: '✅ Boss Rotation released.',
        flags: 64
    });
}

    if (claim.spot) {

    const releasedSpot = claim.spot;

const adcSpot =
    data.channels[channelId]
        .adc[releasedSpot];

adcSpot.owner = null;
adcSpot.ownerId = null;
adcSpot.tickets = 0;
adcSpot.expiresAt = null;

if (adcSpot.reserveId) {

    adcSpot.reserveExpiresAt =
        Date.now() + (3 * 60 * 1000);

    await sendAutoDelete(
        interaction.channel,
        `<@${adcSpot.reserveId}> You have 3 minutes to claim ADC ${releasedSpot.toUpperCase()}.`
    );

} else {

    await sendAutoDelete(
        interaction.channel,
        `🟢 ADC ${releasedSpot.toUpperCase()} is now available.`
    );
}

    delete data.channels[channelId]
        .userClaims[userId];

    await addCooldown(
    data,
    channelId,
    userId
    );

    await saveData(data);

    console.log(
        `[END CLAIM] ${interaction.member.displayName} released ${claim.type}`
    );

    await updatePanel(interaction.channel);

    await interaction.reply({
        content: '✅ Claim ended.',
        flags: 64
    });

    return;
  }

}

   if (interaction.customId === 'swapclaim') {

    const data = loadData();
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    const cooldown =
        getCooldown(
            data,
            channelId,
            userId
        );

    if (cooldown) {

        return interaction.reply({
            content:
`❌ You are on cooldown (${formatCooldown(cooldown - Date.now())})`,
            flags: 64
        });
    }

    const claim =
    data.channels[channelId]
        .userClaims[userId];

let options = [];

if (claim.chamberType === 'adc') {

    options.push(
        {
            label: 'ADC',
            value: 'adc'
        },
        {
            label: 'Boss Rotation',
            value: 'boss'
        }
    );

}

if (claim.chamberType === 'boss') {

    options.push(
        {
            label: 'ADC',
            value: 'adc'
        }
    );

}

const chamberMenu =
new StringSelectMenuBuilder()
.setCustomId('swap_claimtype')
.setPlaceholder('Select Chamber Type')
.addOptions(options);

    const row =
    new ActionRowBuilder()
    .addComponents(chamberMenu);

    await interaction.reply({
    content: 'Select new chamber type',
    components: [row],
    flags: 64
});

    return;
}

    if (interaction.customId === 'reserve') {

    const data = loadData();
    const channelId = interaction.channel.id;

    const alreadyHasClaim =
      data.channels[channelId]
       .userClaims?.[interaction.user.id];

    if (alreadyHasClaim) {
     return interaction.reply({
      content:
    '❌ You already have an active claim.',
      flags:64
   });
}

    const alreadyReserved =
        Object.values(data.channels[channelId].adc)
            .some(x => x.reserveId === interaction.user.id);

    if (alreadyReserved) {

        return interaction.reply({
            content:
                '❌ You already have an active reserve.',
            flags: 64
        });
    }

    const menu =
        new StringSelectMenuBuilder()
        .setCustomId('reserve_spot')
        .setPlaceholder('Select ADC Plate')
        .addOptions(
            {
                label: 'LEFT',
                value: 'left'
            },
            {
                label: 'CENTER',
                value: 'center'
            },
            {
                label: 'RIGHT',
                value: 'right'
            }
        );

    const row =
        new ActionRowBuilder()
        .addComponents(menu);

    await interaction.update({
    content: 'Select ADC Plate',
    components: [row]
      });

    return;
}

    if (interaction.customId === 'extend') {

    const data = loadData();
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    const claim =
        data.channels[channelId]
            ?.userClaims?.[userId];

    if (!claim) {

        return interaction.reply({
            content: '❌ You do not have an active claim.',
            flags: 64
        });
    }

    const remaining =
        claim.expiresAt - Date.now();

    if (remaining > (5 * 60 * 1000)) {

        return interaction.reply({
            content:
                '❌ Extension is only available when 5 minutes or less remain.',
            flags: 64
        });
    }

    if (claim.chamberType === 'adc') {

        const adc =
            data.channels[channelId]
                .adc[claim.spot];

        if (adc.reserveId) {

            return interaction.reply({
                content:
                    '❌ Cannot extend while a reserve is waiting.',
                flags: 64
            });
        }
    }

    let currentTickets =
        claim.tickets || 0;

    let remainingTickets =
        6 - currentTickets;

    if (remainingTickets <= 0) {

        return interaction.reply({
            content:
                '❌ Maximum of 6 tickets reached.',
            flags: 64
        });
    }

    const options = [];

    for (
        let i = 1;
        i <= remainingTickets;
        i++
    ) {

        options.push({
            label: `${i} Ticket${i > 1 ? 's' : ''}`,
            value: `${i}`
        });
    }

    const menu =
        new StringSelectMenuBuilder()
        .setCustomId('extend_tickets')
        .setPlaceholder('Select Extension')
        .addOptions(options);

    const row =
        new ActionRowBuilder()
        .addComponents(menu);

    await interaction.reply({
        content:
            `Current Tickets: ${currentTickets}/6`,
        components: [row],
        flags: 64
    });

    return;
}

// Boss Timer

if (interaction.customId === 'leader1') {

    const data = loadData();
    const channelId = interaction.channel.id;

    const bossRotation =
        data.channels[channelId].bossRotation;

    if (
        !bossRotation.ownerId ||
        bossRotation.ownerId !== interaction.user.id
    ) {

        return interaction.reply({
            content:
                '❌ Only the Boss Rotation owner can mark bosses.',
            flags: 64
        });
    }

    const leader1 =
        data.channels[channelId].bosses.leader1;

    if (
        leader1.expiresAt &&
        Date.now() < leader1.expiresAt
    ) {

        return interaction.reply({
            content:
                '❌ Leader I is already on cooldown.',
            flags: 64
        });
    }

    leader1.expiresAt =
        Date.now() + (30 * 60 * 1000);

    await saveData(data);

    await updatePanel(interaction.channel);

    await interaction.reply({
        content:
            '✅ Leader I marked. Respawn timer starts.',
        flags: 64
    });

    return;
}

if (interaction.customId === 'leader2') {

    const data = loadData();
    const channelId = interaction.channel.id;

    const bossRotation =
        data.channels[channelId].bossRotation;

    if (
        !bossRotation.ownerId ||
        bossRotation.ownerId !== interaction.user.id
    ) {

        return interaction.reply({
            content:
                '❌ Only the Boss Rotation owner can mark bosses.',
            flags: 64
        });
    }

    const leader2 =
        data.channels[channelId].bosses.leader2;

    if (
        leader2.expiresAt &&
        Date.now() < leader2.expiresAt
    ) {

        return interaction.reply({
            content:
                '❌ Leader II is already on cooldown.',
            flags: 64
        });
    }

    leader2.expiresAt =
        Date.now() + (60 * 60 * 1000);

    await saveData(data);

    await updatePanel(interaction.channel);

    await interaction.reply({
        content:
            '✅ Leader II marked. Respawn timer started.',
        flags: 64
    });

    return;
}

if (interaction.customId === 'leader3') {

    const data = loadData();
    const channelId = interaction.channel.id;

    const bossRotation =
        data.channels[channelId].bossRotation;

    if (
        !bossRotation.ownerId ||
        bossRotation.ownerId !== interaction.user.id
    ) {

        return interaction.reply({
            content:
                '❌ Only the Boss Rotation owner can mark bosses.',
            flags: 64
        });
    }

    const leader3 =
        data.channels[channelId].bosses.leader3;

    if (
        leader3.expiresAt &&
        Date.now() < leader3.expiresAt
    ) {

        return interaction.reply({
            content:
                '❌ Leader III is already on cooldown.',
            flags: 64
        });
    }

const nowUtc = Date.now();

const nowLocal =
    new Date(nowUtc + (8 * 60 * 60 * 1000));

const spawnHours = [
    0,
    3,
    6,
    9,
    12,
    15,
    18,
    21
];

let nextSpawn = null;

for (const hour of spawnHours) {

    const candidate =
        new Date(nowLocal);

    candidate.setUTCHours(
        hour,
        0,
        0,
        0
    );

    if (candidate.getTime() > nowLocal.getTime()) {

        nextSpawn = candidate;
        break;
    }
}

if (!nextSpawn) {

    nextSpawn =
        new Date(nowLocal);

    nextSpawn.setUTCDate(
        nextSpawn.getUTCDate() + 1
    );

    nextSpawn.setUTCHours(
        0,
        0,
        0,
        0
    );
}

leader3.expiresAt =
    nextSpawn.getTime() -
    (8 * 60 * 60 * 1000);

    await saveData(data);

    await updatePanel(interaction.channel);

    await interaction.reply({
        content:
            '✅ Leader III marked. Respawn timer started.',
        flags: 64
    });

    return;
}

if (interaction.customId === 'goldore') {

    const data = loadData();
    const channelId = interaction.channel.id;

    const bossRotation =
        data.channels[channelId].bossRotation;

    if (
        !bossRotation.ownerId ||
        bossRotation.ownerId !== interaction.user.id
    ) {

        return interaction.reply({
            content:
                '❌ Only the Boss Rotation owner can mark bosses.',
            flags: 64
        });
    }

    const goldOre =
        data.channels[channelId].bosses.goldOre;

    if (
        goldOre.expiresAt &&
        Date.now() < goldOre.expiresAt
    ) {

        return interaction.reply({
            content:
                '❌ Gold Ore is already on cooldown.',
            flags: 64
        });
    }

    goldOre.expiresAt =
        Date.now() + (31 * 60 * 1000);

    await saveData(data);

    await updatePanel(interaction.channel);

    await interaction.reply({
        content:
            '✅ Gold Ore marked. Respawn timer starts.',
        flags: 64
    });

    return;
}

if (interaction.customId === 'goldherb') {

    const data = loadData();
    const channelId = interaction.channel.id;

    const bossRotation =
        data.channels[channelId].bossRotation;

    if (
        !bossRotation.ownerId ||
        bossRotation.ownerId !== interaction.user.id
    ) {

        return interaction.reply({
            content:
                '❌ Only the Boss Rotation owner can mark bosses.',
            flags: 64
        });
    }

    const goldHerb =
        data.channels[channelId].bosses.goldHerb;

    if (
        goldHerb.expiresAt &&
        Date.now() < goldHerb.expiresAt
    ) {

        return interaction.reply({
            content:
                '❌ Gold Herb is already on cooldown.',
            flags: 64
        });
    }

    goldHerb.expiresAt =
        Date.now() + (31 * 60 * 1000);

    await saveData(data);

    await updatePanel(interaction.channel);

    await interaction.reply({
        content:
            '✅ Gold Herb marked. Respawn timer starts.',
        flags: 64
    });

    return;
}

}

// Select Menu

if (interaction.isStringSelectMenu()) {

if (interaction.customId.startsWith('tickets_')) {


    const data = loadData();
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    const spot =
        interaction.customId.replace('tickets_', '');

    const tickets =
        parseInt(interaction.values[0]);

    if (!data.channels[channelId]) {
        return interaction.reply({
            content: 'Panel not initialized.',
            flags: 64
        });
    }

 if (data.channels[channelId].adc[spot].ownerId) {

    return interaction.reply({
    content:
        `❌ ADC ${spot.toUpperCase()} is already occupied.`,
        flags: 64
});

}

    data.channels[channelId].adc[spot].owner =
    interaction.member.displayName;

    data.channels[channelId].adc[spot].ownerId =
    userId;

    data.channels[channelId].adc[spot].tickets =
    tickets;

// Clear reserve when claimed
    data.channels[channelId].adc[spot].reserve = null;
    data.channels[channelId].adc[spot].reserveId = null;
    data.channels[channelId].adc[spot].reserveExpiresAt = null;

    const duration =
        tickets * 30 * 60 * 1000;

    data.channels[channelId].adc[spot].expiresAt =
        Date.now() + duration;

    data.channels[channelId].userClaims[userId] = {
    type: `ADC ${spot.toUpperCase()}`,
    spot: spot,
    tickets: tickets,
    expiresAt: data.channels[channelId].adc[spot].expiresAt,
    chamberType: 'adc',
    claimPanelMessageId: null
   
 };

    await saveData(data);

    const claimPanel = await interaction.channel.send({
    content:
`${interaction.user} currently owns ADC ${spot.toUpperCase()}.`,
    components: [
        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId(`claim_end_${userId}`)
                .setLabel('❌ End Claim')
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId(`claim_swap_${userId}`)
                .setLabel('🔄 Swap Claim')
                .setStyle(ButtonStyle.Primary)
        )
    ]
});

    data.channels[channelId].userClaims[userId].claimPanelMessageId = claimPanel.id;

await saveData(data);

    console.log(
`[CLAIM] ${interaction.member.displayName} claimed ADC ${spot.toUpperCase()} (${tickets} ticket(s))`
);

await updatePanel(interaction.channel);

await interaction.update({
    content: '✅ Claim successful.',
    components: []
});

return;

}

if (interaction.customId === 'swap_claimtype') {

    const data = loadData();
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    const claim =
        data.channels[channelId].userClaims[userId];

    const selected =
    interaction.values[0];

    // ADC SWAP
    if (
    claim.chamberType === 'adc' &&
    selected === 'adc'
) {

    const options = [];

    if (
        !data.channels[channelId].adc.left.ownerId &&
        !data.channels[channelId].adc.left.reserveId
    ) {
        options.push({
            label: 'LEFT',
            value: 'left'
        });
    }

    if (
        !data.channels[channelId].adc.center.ownerId &&
        !data.channels[channelId].adc.center.reserveId
    ) {
        options.push({
            label: 'CENTER',
            value: 'center'
        });
    }

    if (
        !data.channels[channelId].adc.right.ownerId &&
        !data.channels[channelId].adc.right.reserveId
    ) {
        options.push({
            label: 'RIGHT',
            value: 'right'
        });
    }

    if (options.length === 0) {

        return interaction.reply({
            content:
                '❌ No available ADC spots.',
            flags: 64
        });
    }

    const adcMenu =
        new StringSelectMenuBuilder()
        .setCustomId('swap_adcspot')
        .setPlaceholder('Select ADC Plate')
        .addOptions(options);

    const row =
        new ActionRowBuilder()
        .addComponents(adcMenu);

    await interaction.update({
    content: 'Select ADC Plate',
    components: [row]
});

    return;

}

 if (
    claim.chamberType === 'adc' &&
    selected === 'boss'
) {

        const boss =
            data.channels[channelId].bossRotation;

        if (boss.ownerId) {

            return interaction.reply({
                content:
                    '❌ Boss Rotation is already occupied.',
                flags: 64
            });
        }

        const oldSpot = claim.spot;

        const adc =
            data.channels[channelId].adc[oldSpot];

        adc.owner = null;
        adc.ownerId = null;
        adc.tickets = 0;
        adc.expiresAt = null;

        if (adc.reserveId) {

            adc.reserveExpiresAt =
                Date.now() + (3 * 60 * 1000);

            await sendAutoDelete(
                interaction.channel,
                `<@${adc.reserveId}> You have 3 minutes to claim ADC ${oldSpot.toUpperCase()}.`
            );
        }

        boss.owner =
            interaction.member.displayName;

        boss.ownerId =
            userId;

        boss.tickets =
            claim.tickets;

        boss.expiresAt =
            claim.expiresAt;

        claim.type =
            'Boss Rotation';

        claim.chamberType =
            'boss';

        delete claim.spot;

        await saveData(data);

        const panel =
            await interaction.channel.messages.fetch(
                claim.claimPanelMessageId
            );

        await panel.edit({
            content:
`${interaction.user} currently owns Boss Rotation.`
        });

        await updatePanel(interaction.channel);

        await interaction.update({
    content: '✅ Swap successful.',
    components: []
});

        return;
    }

  if (
    claim.chamberType === 'boss' &&
    selected === 'adc'
) {

    const options = [];

    if (
        !data.channels[channelId].adc.left.ownerId &&
        !data.channels[channelId].adc.left.reserveId
    ) {
        options.push({
            label: 'LEFT',
            value: 'left'
        });
    }

    if (
        !data.channels[channelId].adc.center.ownerId &&
        !data.channels[channelId].adc.center.reserveId
    ) {
        options.push({
            label: 'CENTER',
            value: 'center'
        });
    }

    if (
        !data.channels[channelId].adc.right.ownerId &&
        !data.channels[channelId].adc.right.reserveId
    ) {
        options.push({
            label: 'RIGHT',
            value: 'right'
        });
    }

    if (!options.length) {

        return interaction.reply({
            content: '❌ No available ADC spots.',
            flags: 64
        });
    }

    const adcMenu =
        new StringSelectMenuBuilder()
        .setCustomId('swap_adcspot')
        .setPlaceholder('Select ADC Plate')
        .addOptions(options);

    const row =
        new ActionRowBuilder()
        .addComponents(adcMenu);

    await interaction.update({
        content: 'Select ADC Plate',
        components: [row]
    });

    return;
}

}

    if (interaction.customId === 'reserve_spot') {

    const data = loadData();
    const channelId = interaction.channel.id;

    const userId = interaction.user.id;

    const cooldown =
        getCooldown(
            data,
            channelId,
            userId
        );

    if (cooldown) {

          return interaction.reply({
               content:
    `❌ You are on cooldown (${formatCooldown(cooldown - Date.now())})`,
            flags: 64
        });
    }

    const spot = interaction.values[0];

    const adc =
        data.channels[channelId].adc[spot];

    const remaining =
    adc.expiresAt
        ? adc.expiresAt - Date.now()
        : 0;

    if (remaining > (3 * 60 * 1000)) {

    return interaction.reply({
        content:
            '❌ Reserve is only available when 3 minutes or less remaining.',
        flags: 64
    });
}

    if (!adc.ownerId) {

        return interaction.reply({
            content:
                `❌ ADC ${spot.toUpperCase()} is not occupied.`,
            flags: 64
        });
    }

    if (adc.reserveId) {

        return interaction.reply({
            content:
                `❌ ADC ${spot.toUpperCase()} already has a reserve.`,
            flags: 64
        });
    }

    adc.reserve =
        interaction.member.displayName;

    adc.reserveId =
        interaction.user.id;

    await saveData(data);

    await updatePanel(interaction.channel);

    await interaction.reply({
        content:
            `✅ Reserved ADC ${spot.toUpperCase()}.`,
        flags: 64
    });

    return;
}

    if (interaction.customId === 'claimtype') {

        const choice = interaction.values[0];

        if (choice === 'adc') {

            const adcMenu =
                new StringSelectMenuBuilder()
                .setCustomId('adcspot')
                .setPlaceholder('Select ADC Plate')
                .addOptions(
                    {
                        label: 'LEFT',
                        value: 'left'
                    },
                    {
                        label: 'CENTER',
                        value: 'center'
                    },
                    {
                        label: 'RIGHT',
                        value: 'right'
                    }
                );

            const row =
                new ActionRowBuilder()
                .addComponents(adcMenu);

            await interaction.update({
     content: 'Select ADC Plate',
     components: [row]
});

            return;
        }

        if (choice === 'boss') {

    const ticketMenu =
        new StringSelectMenuBuilder()
        .setCustomId('boss_tickets')
        .setPlaceholder('Select Ticket Count')
        .addOptions(
            { label: '1 Ticket (30 mins)', value: '1' },
            { label: '2 Tickets (1 hr)', value: '2' },
            { label: '3 Tickets (1 hr 30 mins)', value: '3' },
            { label: '4 Tickets (2 hrs)', value: '4' },
            { label: '5 Tickets (2 hrs 30 mins)', value: '5' },
            { label: '6 Tickets (3 hrs)', value: '6' }
        );

    const row =
        new ActionRowBuilder()
        .addComponents(ticketMenu);

    await interaction.update({
    content: 'Select Ticket Count',
    components: [row]
})

    return;
}

    }

    if (interaction.customId === 'swap_adcspot') {

    const swapMessage = interaction.message;

    await interaction.update({
    content: '⏳ Processing swap...',
    components: []

});

    const spot = interaction.values[0];

    const data = loadData();
    const channelId = interaction.channel.id;

    if (data.channels[channelId].adc[spot].ownerId) {

    await interaction.editReply({
        content: `❌ ADC ${spot.toUpperCase()} is already occupied.`
    });

    return;
}

    const adc =
    data.channels[channelId].adc[spot];

if (
    adc.reserveId &&
    adc.reserveExpiresAt &&
    Date.now() < adc.reserveExpiresAt &&
    adc.reserveId !== interaction.user.id
) {

    await interaction.editReply({
        content:
            `❌ ADC ${spot.toUpperCase()} is reserved for another user.`
    });

    return;
}

    const userId = interaction.user.id;

const claim =
    data.channels[channelId].userClaims[userId];

if (!claim) {

    await interaction.editReply({
        content: 'No active claim found.'
    });

    return;
}

if (claim.chamberType === 'adc') {

    const oldSpot = claim.spot;

    data.channels[channelId].adc[oldSpot].owner = null;
    data.channels[channelId].adc[oldSpot].ownerId = null;
    data.channels[channelId].adc[oldSpot].tickets = 0;
    data.channels[channelId].adc[oldSpot].expiresAt = null;

    if (
        data.channels[channelId].adc[oldSpot].reserveId
    ) {

        data.channels[channelId].adc[oldSpot].reserveExpiresAt =
            Date.now() + (3 * 60 * 1000);

        await sendAutoDelete(
            interaction.channel,
            `<@${data.channels[channelId].adc[oldSpot].reserveId}> You have 3 minutes to claim ADC ${oldSpot.toUpperCase()}.`
        );
    }

}
else {

    const boss =
        data.channels[channelId].bossRotation;

    boss.owner = null;
    boss.ownerId = null;
    boss.tickets = 0;
    boss.expiresAt = null;
}

data.channels[channelId].adc[spot] = {
    owner: interaction.member.displayName,
    ownerId: userId,
    tickets: claim.tickets,
    reserve: null,
    reserveId: null,
    reserveExpiresAt: null,
    expiresAt: claim.expiresAt
};

claim.spot = spot;
claim.type = `ADC ${spot.toUpperCase()}`;
claim.chamberType = 'adc';

await addCooldown(
    data,
    channelId,
    userId
);

console.log(
`[SWAP] ${interaction.member.displayName} Swap successful. ${spot.toUpperCase()}`
);

await saveData(data);

const panelId = claim.claimPanelMessageId;

if (panelId) {

    try {

        const panel =
            await interaction.channel.messages.fetch(
                panelId
            );

        await panel.edit({
            content:
`${interaction.user} currently owns ADC ${spot.toUpperCase()}.`
        });

    } catch (err) {
        console.log(
            '[SWAP] Failed to update claim panel.'
        );
    }
}

await updatePanel(interaction.channel);

await interaction.editReply({
    content: '✅ Swap successful.',
    components: []
});

return;

}

 // Boss Handler

    if (interaction.customId === 'boss_tickets') {

    await interaction.update({
    content: '⏳ Processing claim...',
    components: []
});

    const data = loadData();
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    const existingClaim =
    data.channels[channelId]
        ?.userClaims?.[userId];

    if (existingClaim) {

    await interaction.editReply({
        content:
            '❌ You already own a chamber.'
    });

    return;
}

    const hasReserve =
      Object.values(
    data.channels[channelId].adc
).some(adc =>
    adc.reserveId === userId
);

    if (hasReserve) {

    await interaction.editReply({
        content:
    '❌ You cannot claim Boss Rotation while holding an ADC reserve.'
    });

    return;
}

    const tickets =
        parseInt(interaction.values[0]);

    const boss =
        data.channels[channelId].bossRotation;

    if (boss.ownerId) {

        await interaction.editReply({
            content:
                '❌ Boss Rotation is already occupied.'
        });

        return;
    }

    const duration =
        tickets * 30 * 60 * 1000;

    boss.owner =
        interaction.member.displayName;

    boss.ownerId =
        userId;

    boss.tickets =
        tickets;

    boss.expiresAt =
        Date.now() + duration;

    data.channels[channelId].userClaims[userId] = {
        type: 'Boss Rotation',
        tickets: tickets,
        expiresAt: boss.expiresAt,
        chamberType: 'boss',
        claimPanelMessageId: null
    };

    await saveData(data);

    const claimPanel =
        await interaction.channel.send({

        content:
`${interaction.user} currently owns Boss Rotation.`,

        components: [
            new ActionRowBuilder().addComponents(

                new ButtonBuilder()
                    .setCustomId(`claim_end_${userId}`)
                    .setLabel('❌ End Claim')
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId(`claim_swap_${userId}`)
                    .setLabel('🔄 Swap Claim')
                    .setStyle(ButtonStyle.Primary)
            )
        ]
    });

    data.channels[channelId]
        .userClaims[userId]
        .claimPanelMessageId =
        claimPanel.id;

    await saveData(data);

    console.log(
`[CLAIM] ${interaction.member.displayName} claimed Boss Rotation (${tickets} ticket(s))`
    );

    await updatePanel(interaction.channel);

    await interaction.editReply({
    content: '✅ Claim successful.',
    components: []
});

    return;
}

// EXTEND TICKETS

  if (interaction.customId === 'extend_tickets') {

    const data = loadData();
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    const claim =
        data.channels[channelId]
            .userClaims[userId];

    if (!claim) {

        await interaction.editReply({
            content: '❌ No active claim found.'
        });

        return;
    }

    const addTickets =
        parseInt(interaction.values[0]);

    if ((claim.tickets + addTickets) > 6) {

    await interaction.editReply({
        content:
            '❌ Maximum of 6 tickets reached.'
    });

    return;
}

    if (claim.tickets >= 6) {

    await interaction.editReply({
        content:
            '❌ Maximum of 6 tickets already reached.'
    });

    return;
}

    claim.tickets += addTickets;

    const addedTime =
        addTickets * 30 * 60 * 1000;

    claim.expiresAt += addedTime;

    if (claim.chamberType === 'boss') {

        const boss =
            data.channels[channelId]
                .bossRotation;

        boss.tickets =
            claim.tickets;

        boss.expiresAt =
            claim.expiresAt;
    }

    if (claim.chamberType === 'adc') {

        const adc =
            data.channels[channelId]
                .adc[claim.spot];

        adc.tickets =
            claim.tickets;

        adc.expiresAt =
            claim.expiresAt;
    }

    await saveData(data);

await updatePanel(
    interaction.channel
);

await interaction.update({
    content: '✅ Extension applied.',
    components: []
});

return;

}

// ADC Handler

    if (interaction.customId === 'adcspot') {

    const data = loadData();
    const channelId = interaction.channel.id;

    const spot = interaction.values[0];

    const adc =
    data.channels[channelId].adc[spot];

    const existingClaim =
    data.channels[channelId]
        ?.userClaims?.[interaction.user.id];

if (existingClaim) {

    return interaction.reply({
        content:
            '❌ You already own a chamber.',
        flags: 64
    });
}

    if (adc.ownerId) {

        return interaction.reply({
            content: `❌ ADC ${spot.toUpperCase()} is already occupied.`,
            flags: 64
        });
    }

    if (
        adc.reserveId &&
        adc.reserveExpiresAt &&
        Date.now() < adc.reserveExpiresAt &&
        adc.reserveId !== interaction.user.id
    ) {

        return interaction.reply({
            content:
                `❌ ADC ${spot.toUpperCase()} is reserved for another user.`,
            flags: 64
        });
    }

    const ticketMenu =
        new StringSelectMenuBuilder()
        .setCustomId(`tickets_${spot}`)
        .setPlaceholder('Select Ticket Count')
        .addOptions(
        { label: '1 Ticket (30 mins)', value: '1' },
        { label: '2 Tickets (1 hr)', value: '2' },
        { label: '3 Tickets (1 hr 30 mins)', value: '3' },
        { label: '4 Tickets (2 hrs)', value: '4' },
        { label: '5 Tickets (2 hrs 30 mins)', value: '5' },
        { label: '6 Tickets (3 hrs)', value: '6' }
    );

    const row =
        new ActionRowBuilder()
        .addComponents(ticketMenu);

    await interaction.update({
    content: `ADC Plate Selected: ${spot.toUpperCase()}`,
    components: [row]
});

    return;
  }

    return;

}

if (!interaction.isChatInputCommand()) return;

    const data = loadData();
    const channelId = interaction.channel.id;

if (interaction.commandName === 'setup') {

if (data.channels[channelId]) {

    return interaction.reply({
        content:
'❌ A panel already exists in this channel.',
        flags: 64
    });
}

data.channels[channelId] =
    defaultServerData();

const embed = new EmbedBuilder()
.setColor(0x57F287)
.setTitle('🐸 青蛙・341')
.setDescription('Claim a chamber using the button below.')

.addFields(
{
    name: 'ㅤADC STATUS',
    value: '🚦 0/3 Occupied\n\u200B',
    inline: false
},

{
    name: '🟢 LEFT',
    value:
`Status: FREE
👤 None
🎟 0
⏰ --:--:--

📌 None`,
    inline: true
},

{
    name: '🟢 CENTER',
    value:
`Status: FREE
👤 None
🎟 0
⏰ --:--:--

📌 None`,
    inline: true
},

{
    name: '🟢 RIGHT',
    value:
`Status: FREE
👤 None
🎟 0
⏰ --:--:--

📌 None`,
    inline: true
},

{
    name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🟢 BOSS ROTATION',
    value:
`👤: Free to Claim
 ⏰: --:--:--

🟢 Leader I - Alive
🟢 Leader II - Alive
🟢 Leader III - Alive
🟢 Gold Ore - Alive
🟢 Gold Herb - Alive

*⏱️ Panel updates every 15 seconds.*`,
    inline: false
}

);

// BUTTONS

const row1 = new ActionRowBuilder()
.addComponents(

    new ButtonBuilder()
        .setCustomId('claim')
        .setLabel('⚔ Claim')
        .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
        .setCustomId('reserve')
        .setLabel('📌 Reserve')
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId('extend')
        .setLabel('⏰ Extend')
        .setStyle(ButtonStyle.Primary),

);

const row2 = new ActionRowBuilder()
.addComponents(

new ButtonBuilder()
    .setCustomId('leader1')
    .setLabel('👹 Leader I')
    .setStyle(ButtonStyle.Success),

new ButtonBuilder()
    .setCustomId('leader2')
    .setLabel('👹 Leader II')
    .setStyle(ButtonStyle.Success),

new ButtonBuilder()
    .setCustomId('leader3')
    .setLabel('👹 Leader III')
    .setStyle(ButtonStyle.Success),

);

const row3 = new ActionRowBuilder()
.addComponents(

new ButtonBuilder()
    .setCustomId('goldore')
    .setLabel('🪙 Gold Ore')
    .setStyle(ButtonStyle.Success),

new ButtonBuilder()
    .setCustomId('goldherb')
    .setLabel('🌿 Gold Herb')
    .setStyle(ButtonStyle.Success)
);


const panelMessage = await interaction.channel.send({
    embeds: [embed],
    components: [row1, row2, row3]
});

data.channels[channelId].panelMessageId = panelMessage.id;

await saveData(data);

    await interaction.reply({
        content: 'Panel created.',
        flags: 64
    });
}

    if (interaction.commandName === 'removepanel') {

        const panelId =
data.channels[channelId]?.panelMessageId;

if (panelId) {

    try {

        const panel =
            await interaction.channel.messages.fetch(
                panelId
            );

        await panel.delete();

    } catch (err) {

        console.log(
            '[REMOVE PANEL] Panel already deleted.'
        );
    }
}

delete data.channels[channelId];

await saveData(data);

await interaction.reply({
    content: 'Panel removed.',
    flags: 64
});

}

if (interaction.commandName === 'removecd') {

    const user =
        interaction.options.getUser('user');

    delete data.channels[channelId]
        .userCooldowns[user.id];

    await saveData(data);

    return interaction.reply({
        content:
            `✅ Cooldown removed for ${user.username}.`,
        flags: 64
    });
}

if (interaction.commandName === 'forcereset') {

    const panelId =
        data.channels[channelId].panelMessageId;

    data.channels[channelId] =
        defaultServerData();

    data.channels[channelId].panelMessageId =
        panelId;

    await saveData(data);

    await updatePanel(interaction.channel);

    return interaction.reply({
        content:
            '✅ All chamber data reset.',
        flags: 64
    });
}

if (interaction.commandName === 'reset') {

    const target =
        interaction.options.getString('target');

    if (target === 'boss') {

        const boss =
            data.channels[channelId].bossRotation;

        if (boss.ownerId) {

            const claim =
                data.channels[channelId]
                .userClaims[boss.ownerId];

            if (claim?.claimPanelMessageId) {

                try {

                    const msg =
                        await interaction.channel.messages.fetch(
                            claim.claimPanelMessageId
                        );

                    await msg.delete();

                } catch {}
            }

            delete data.channels[channelId]
                .userClaims[boss.ownerId];
        }

        boss.owner = null;
        boss.ownerId = null;
        boss.tickets = 0;
        boss.expiresAt = null;

        await saveData(data);

        await updatePanel(interaction.channel);

        return interaction.reply({
            content:
                '✅ Boss Rotation reset.',
            flags: 64
        });
    }

    const adc =
        data.channels[channelId].adc[target];

    if (adc.ownerId) {

        const claim =
            data.channels[channelId]
            .userClaims[adc.ownerId];

        if (claim?.claimPanelMessageId) {

            try {

                const msg =
                    await interaction.channel.messages.fetch(
                        claim.claimPanelMessageId
                    );

                await msg.delete();

            } catch {}
        }

        delete data.channels[channelId]
            .userClaims[adc.ownerId];
    }

    adc.owner = null;
    adc.ownerId = null;
    adc.tickets = 0;
    adc.expiresAt = null;
    adc.reserve = null;
    adc.reserveId = null;
    adc.reserveExpiresAt = null;

    await saveData(data);

    await updatePanel(interaction.channel);

    return interaction.reply({
        content:
            `✅ ADC ${target.toUpperCase()} reset.`,
        flags: 64
    });
}

if (interaction.commandName === 'addadc') {

    const data = loadData();

    const channelId =
        interaction.channel.id;

    const discordUser =
        interaction.options.getUser('user');

    const manualName =
        interaction.options.getString('name');

    const spot =
        interaction.options.getString('spot');

    const tickets =
        interaction.options.getInteger('tickets');

    const name =
        discordUser
            ? discordUser.username
            : manualName;

    if (!name) {

        return interaction.reply({
            content:
                '❌ Select a user or enter a name.',
            flags: 64
        });
    }

    const adc =
        data.channels[channelId].adc[spot];

    if (adc.ownerId) {

        return interaction.reply({
            content:
                `❌ ADC ${spot.toUpperCase()} already occupied.`,
            flags: 64
        });
    }

    adc.owner = name;

    adc.ownerId =
        discordUser
            ? discordUser.id
            : `manual_${Date.now()}`;

    adc.tickets = tickets;

    adc.expiresAt =
        Date.now() +
        (tickets * 30 * 60 * 1000);

    if (discordUser) {

    data.channels[channelId]
        .userClaims[discordUser.id] = {

        type: `ADC ${spot.toUpperCase()}`,
        spot,
        tickets,
        expiresAt: adc.expiresAt,
        chamberType: 'adc',
        claimPanelMessageId: null
    };
}

    await saveData(data);

    await updatePanel(interaction.channel);

    return interaction.reply({
        content:
            `✅ Added ${name} to ADC ${spot.toUpperCase()}.`,
        flags: 64
    });
}

if (interaction.commandName === 'removeclaim') {

    const data = loadData();

    const channelId =
        interaction.channel.id;

    const type =
        interaction.options.getString('type');

    if (type === 'boss') {

    const boss =
        data.channels[channelId].bossRotation;

    const ownerId = boss.ownerId;

    if (
        ownerId &&
        data.channels[channelId].userClaims
    ) {

        delete data.channels[channelId]
            .userClaims[ownerId];
    }

    boss.owner = null;
    boss.ownerId = null;
    boss.tickets = 0;
    boss.expiresAt = null;

    await saveData(data);

    await updatePanel(interaction.channel);

    return interaction.reply({
        content:
            '✅ Boss Rotation cleared.',
        flags: 64
    });
}

    const adc =
        data.channels[channelId].adc[type];

const ownerId =
        adc.ownerId;

if (
    ownerId &&
    data.channels[channelId].userClaims
) {

    delete data.channels[channelId]
        .userClaims[ownerId];
}

adc.owner = null;
adc.ownerId = null;
adc.tickets = 0;
adc.expiresAt = null;

adc.reserve = null;
adc.reserveId = null;
adc.reserveExpiresAt = null;

    await saveData(data);

    await updatePanel(interaction.channel);

    return interaction.reply({
        content:
            `✅ ADC ${type.toUpperCase()} cleared.`,
        flags: 64
    });
}

if (interaction.commandName === 'forceswap') {

    await interaction.deferReply({
        flags: 64
    });

    const from =
        interaction.options.getString('from');

    const to =
        interaction.options.getString('to');

    if (from === to) {

        return interaction.reply({
            content:
                '❌ Cannot swap the same spot.',
            flags: 64
        });
    }

    const fromSpot =
        data.channels[channelId].adc[from];

    const toSpot =
        data.channels[channelId].adc[to];

    if (!fromSpot.ownerId) {

        return interaction.reply({
            content:
                `❌ ADC ${from.toUpperCase()} is empty.`,
            flags: 64
        });
    }

    const temp = {

        owner:
            fromSpot.owner,

        ownerId:
            fromSpot.ownerId,

        tickets:
            fromSpot.tickets,

        reserve:
            fromSpot.reserve,

        reserveId:
            fromSpot.reserveId,

        reserveExpiresAt:
            fromSpot.reserveExpiresAt,

        expiresAt:
            fromSpot.expiresAt
    };

    fromSpot.owner =
        toSpot.owner;

    fromSpot.ownerId =
        toSpot.ownerId;

    fromSpot.tickets =
        toSpot.tickets;

    fromSpot.reserve =
        toSpot.reserve;

    fromSpot.reserveId =
        toSpot.reserveId;

    fromSpot.reserveExpiresAt =
        toSpot.reserveExpiresAt;

    fromSpot.expiresAt =
        toSpot.expiresAt;

    toSpot.owner =
        temp.owner;

    toSpot.ownerId =
        temp.ownerId;

    toSpot.tickets =
        temp.tickets;

    toSpot.reserve =
        temp.reserve;

    toSpot.reserveId =
        temp.reserveId;

    toSpot.reserveExpiresAt =
        temp.reserveExpiresAt;

    toSpot.expiresAt =
        temp.expiresAt;

    if (
        temp.ownerId &&
        data.channels[channelId]
            .userClaims[temp.ownerId]
    ) {

        data.channels[channelId]
            .userClaims[temp.ownerId]
            .spot = to;

        data.channels[channelId]
            .userClaims[temp.ownerId]
            .type =
            `ADC ${to.toUpperCase()}`;
    }

    if (
        fromSpot.ownerId &&
        data.channels[channelId]
            .userClaims[fromSpot.ownerId]
    ) {

        data.channels[channelId]
            .userClaims[fromSpot.ownerId]
            .spot = from;

        data.channels[channelId]
            .userClaims[fromSpot.ownerId]
            .type =
            `ADC ${from.toUpperCase()}`;
    }

    await saveData(data);

    await updatePanel(
        interaction.channel
    );

    return interaction.editReply({
    content:
`✅ ADC ${from.toUpperCase()} ↔ ADC ${to.toUpperCase()} swapped.`
});

}

if (interaction.commandName === 'settimer') {

    const target =
        interaction.options.getString('target');

    const minutes =
        interaction.options.getInteger('minutes');

    const expiresAt =
        Date.now() + (minutes * 60 * 1000);

    if (
        target === 'left' ||
        target === 'center' ||
        target === 'right'
    ) {

        const spot =
            data.channels[channelId].adc[target];

        if (!spot.ownerId) {

            return interaction.reply({
                content:
                    `❌ ADC ${target.toUpperCase()} is empty.`,
                flags: 64
            });
        }

        spot.expiresAt =
            expiresAt;
    }

    if (target === 'boss') {

        const boss =
            data.channels[channelId]
                .bossRotation;

        if (!boss.ownerId) {

            return interaction.reply({
                content:
                    '❌ Boss Rotation is empty.',
                flags: 64
            });
        }

        boss.expiresAt =
            expiresAt;
    }

    await saveData(data);

    await updatePanel(
        interaction.channel
    );

    return interaction.reply({
        content:
            `✅ Timer updated to ${minutes} minutes.`,
        flags: 64
    });
}

if (interaction.commandName === 'bosstimer') {

    const boss =
        interaction.options.getString('boss');

    const time =
        interaction.options.getString('time');

    const match =
        /^([01]?\d|2[0-3]):([0-5]\d)$/
            .test(time);

    if (!match) {

        return interaction.reply({
            content:
                '❌ Use HH:MM format. Example: 23:41',
            flags: 64
        });
    }

    const [hour, minute] =
        time.split(':').map(Number);

    const killTime = new Date();

    killTime.setHours(hour);
    killTime.setMinutes(minute);
    killTime.setSeconds(0);
    killTime.setMilliseconds(0);

    if (
        killTime.getTime() >
        Date.now()
    ) {
        killTime.setDate(
            killTime.getDate() - 1
        );
    }

    let respawnMinutes = 0;

    switch (boss) {

        case 'leader1':
            respawnMinutes = 30;
            break;

        case 'leader2':
            respawnMinutes = 60;
            break;

        case 'leader3':
            respawnMinutes = 180;
            break;

        case 'goldore':
            respawnMinutes = 31;
            break;

        case 'goldherb':
            respawnMinutes = 31;
            break;
    }

    const expiresAt =
        killTime.getTime() +
        (respawnMinutes * 60 * 1000);

    const bosses =
    data.channels[channelId].bosses;

if (boss === 'leader1')
    bosses.leader1.expiresAt = expiresAt;

if (boss === 'leader2')
    bosses.leader2.expiresAt = expiresAt;

if (boss === 'leader3')
    bosses.leader3.expiresAt = expiresAt;

if (boss === 'goldore')
    bosses.goldOre.expiresAt = expiresAt;

if (boss === 'goldherb')
    bosses.goldHerb.expiresAt = expiresAt;

    await saveData(data);

    await updatePanel(
        interaction.channel
    );

    const respawn =
        new Date(expiresAt);

    return interaction.reply({
        content:
`✅ ${boss.toUpperCase()} updated.

Kill Time: ${time}
Respawn: ${respawn.toLocaleTimeString()}`,
        flags: 64
    });
}

});

// SLASH COMMANDS

const commands = [
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Create chamber panel'),

    new SlashCommandBuilder()
        .setName('removepanel')
        .setDescription('Remove chamber panel'),

new SlashCommandBuilder()
.setName('removecd')
.setDescription('Remove cooldown from a user')
.addUserOption(option =>
    option
        .setName('user')
        .setDescription('Target user')
        .setRequired(true)
)
.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild
),

new SlashCommandBuilder()
.setName('forcereset')
.setDescription('Reset all chamber data')
.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild
),

new SlashCommandBuilder()
.setName('reset')
.setDescription('Reset a specific chamber')
.addStringOption(option =>
    option
        .setName('target')
        .setDescription('What to reset')
        .setRequired(true)
        .addChoices(
            { name: 'LEFT', value: 'left' },
            { name: 'CENTER', value: 'center' },
            { name: 'RIGHT', value: 'right' },
            { name: 'BOSS ROTATION', value: 'boss' }
        )
)
.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild
),

new SlashCommandBuilder()
.setName('addadc')
.setDescription('Manually add ADC owner')

.addStringOption(option =>
    option
        .setName('spot')
        .setDescription('ADC spot')
        .setRequired(true)
        .addChoices(
            { name: 'LEFT', value: 'left' },
            { name: 'CENTER', value: 'center' },
            { name: 'RIGHT', value: 'right' }
        )
)

.addIntegerOption(option =>
    option
        .setName('tickets')
        .setDescription('Ticket count')
        .setRequired(true)
)

.addUserOption(option =>
    option
        .setName('user')
        .setDescription('Discord member')
        .setRequired(false)
)

.addStringOption(option =>
    option
        .setName('name')
        .setDescription('Manual name')
        .setRequired(false)
)

.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild
),

new SlashCommandBuilder()
.setName('removeclaim')
.setDescription('Remove ADC or Boss claim')

.addStringOption(option =>
    option
        .setName('type')
        .setDescription('Claim type')
        .setRequired(true)
        .addChoices(
            { name: 'ADC LEFT', value: 'left' },
            { name: 'ADC CENTER', value: 'center' },
            { name: 'ADC RIGHT', value: 'right' },
            { name: 'Boss Rotation', value: 'boss' }
        )
)

.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild
),

new SlashCommandBuilder()
.setName('forceswap')
.setDescription('Force swap two ADC spots')

.addStringOption(option =>
    option
        .setName('from')
        .setDescription('Source spot')
        .setRequired(true)
        .addChoices(
            { name: 'LEFT', value: 'left' },
            { name: 'CENTER', value: 'center' },
            { name: 'RIGHT', value: 'right' }
        )
)

.addStringOption(option =>
    option
        .setName('to')
        .setDescription('Destination spot')
        .setRequired(true)
        .addChoices(
            { name: 'LEFT', value: 'left' },
            { name: 'CENTER', value: 'center' },
            { name: 'RIGHT', value: 'right' }
        )
)

.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild
),

new SlashCommandBuilder()
.setName('settimer')
.setDescription('Set remaining time for an occupied spot')
.addStringOption(option =>
    option
    .setName('target')
    .setDescription('Spot to modify')
    .setRequired(true)
    .addChoices(
        { name: 'ADC LEFT', value: 'left' },
        { name: 'ADC CENTER', value: 'center' },
        { name: 'ADC RIGHT', value: 'right' },
        { name: 'Boss Rotation', value: 'boss' }
    )
)
.addIntegerOption(option =>
    option
    .setName('minutes')
    .setDescription('New remaining time')
    .setRequired(true)
)
.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild
),

new SlashCommandBuilder()
    .setName('bosstimer')
    .setDescription('Manually set boss kill time')
    .addStringOption(option =>
        option
            .setName('boss')
            .setDescription('Boss')
            .setRequired(true)
            .addChoices(
                { name: 'Leader 1', value: 'leader1' },
                { name: 'Leader 2', value: 'leader2' },
                { name: 'Leader 3', value: 'leader3' },
                { name: 'Gold Ore', value: 'goldore' },
                { name: 'Gold Herb', value: 'goldherb' }
            )
    )
    .addStringOption(option =>
        option
            .setName('time')
            .setDescription('Kill time HH:MM (24h format)')
            .setRequired(true)
    )
    .setDefaultMemberPermissions(
        PermissionFlagsBits.ManageGuild
    ),

]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(
    process.env.CLIENT_ID,
    '1448185886024925319'
),
            { body: commands }
        );

        console.log('Slash commands registered.');
    } catch (error) {
        console.error(error);
    }
})();

setInterval(async () => {

    const data = loadData();

    for (const channelId of Object.keys(data.channels || {})) {

        try {

    const channel =
        await client.channels.fetch(channelId);

    if (!channel) continue;

    const boss =
        data.channels[channelId].bossRotation;

    if (
    boss.ownerId &&
    boss.expiresAt &&
    Date.now() >= boss.expiresAt
) {

    console.log(
        `[EXPIRED] Boss Rotation released`
    );

    const claim =
        data.channels[channelId]
        .userClaims[boss.ownerId];

    if (claim?.claimPanelMessageId) {

        try {

            const msg =
                await channel.messages.fetch(
                    claim.claimPanelMessageId
                );

            await msg.delete();

        } catch (err) {

            console.log(
                '[EXPIRE] Boss claim panel already deleted.'
            );
        }
    }

    delete data.channels[channelId]
        .userClaims[boss.ownerId];

    boss.owner = null;
    boss.ownerId = null;
    boss.tickets = 0;
    boss.expiresAt = null;

    await saveData(data);

    await updatePanel(channel);
}

    const adcSpots = ['left', 'center', 'right'];

    for (const spot of adcSpots) {

    const adc =
        data.channels[channelId].adc[spot];

    if (
    adc.reserveId &&
    adc.reserveExpiresAt &&
    Date.now() >= adc.reserveExpiresAt
) {

    const expiredReserveId =
        adc.reserveId;

    await addCooldown(
        data,
        channelId,
        expiredReserveId
    );

    console.log(
        `[RESERVE EXPIRED] ADC ${spot.toUpperCase()}`
    );

    adc.reserve = null;
    adc.reserveId = null;
    adc.reserveExpiresAt = null;

    await sendAutoDelete(
        channel,
        `🟢 Reserve expired. ADC ${spot.toUpperCase()} is now open.`
    );

    await saveData(data);

    await updatePanel(channel);
}

    if (
        adc.ownerId &&
        adc.expiresAt &&
        Date.now() >= adc.expiresAt
    ) {

            console.log(
                `[EXPIRED] ADC ${spot.toUpperCase()} released`
            );

            const claim =
             data.channels[channelId]
             .userClaims[adc.ownerId];

if (claim?.claimPanelMessageId) {

    try {

        const msg =
            await channel.messages.fetch(
                claim.claimPanelMessageId
            );

        await msg.delete();

    } catch (err) {
        console.log(
            '[EXPIRE] Claim panel already deleted.'
        );
    }
}

const expiredOwnerId = adc.ownerId;

delete data.channels[channelId]
    .userClaims[expiredOwnerId];

      adc.owner = null;
      adc.ownerId = null;
      adc.tickets = 0;
      adc.expiresAt = null;

       if (adc.reserveId) {

    adc.reserveExpiresAt =
        Date.now() + (3 * 60 * 1000);

    await sendAutoDelete(
        channel,
        `<@${adc.reserveId}> You have 3 minutes to claim ADC ${spot.toUpperCase()}.`
    );

} else {

    await sendAutoDelete(
        channel,
        `🟢 ADC ${spot.toUpperCase()} is now available.`
    );

}
        }
    }

    await saveData(data);

    await updatePanel(channel);

        } catch (err) {
            console.error(
                `[AUTO REFRESH FAILED] ${channelId}`,
                err
            );
        }
    }

}, 15000);


client.login(process.env.TOKEN);


