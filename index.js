// Base Data 

const fs = require('fs');

function defaultServerData() {
    return {
    channelConfig: {
        adcMode: 'single'
    },

    panelMessageId: null,
    ms11PanelMessageId: null,

    userClaims: {},

    specialClaims: {},

    userCooldowns: {},

        adc: {
            left: {
                owner: null,
                ownerId: null,
                tickets: 0,
                expiresAt: null
            },
            center: {
                owner: null,
                ownerId: null,
                tickets: 0,
                expiresAt: null
            },
            right: {
                owner: null,
                ownerId: null,
                tickets: 0,
                expiresAt: null
            }
        },

        adc2: {
    left: {
        owner: null,
        ownerId: null,
        tickets: 0,
        expiresAt: null
    },
    center: {
        owner: null,
        ownerId: null,
        tickets: 0,
        expiresAt: null
    },
    right: {
        owner: null,
        ownerId: null,
        tickets: 0,
        expiresAt: null
    }
},

        bossRotation: {
    slot1: {
        owner: null,
        ownerId: null,
        tickets: 0,
        expiresAt: null
    },

    slot2: {
        owner: null,
        ownerId: null,
        tickets: 0,
        expiresAt: null
    },

    slot3: {
        owner: null,
        ownerId: null,
        tickets: 0,
        expiresAt: null
    }
},

     specialChambers: {
    frenzy: {
        claims: []
    },
    fury: {
        claims: []
    },
    lucky: {
        claims: []
    },
    others: {
        claims: []
    }

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
        },
        sealingChamber: {
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
    ms = 600000
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

async function updatePanel(channel, data = null) {

    data ??= loadData();
    const channelId = channel.id;

    if (!data.channels[channelId]) return;

if (!data.channels[channelId].adc2) {
    data.channels[channelId].adc2 = defaultServerData().adc2;
}

if (!data.channels[channelId].adc) {
    data.channels[channelId].adc = defaultServerData().adc;
}

if (!data.channels[channelId].bosses) {
    data.channels[channelId].bosses = defaultServerData().bosses;
}

if (!data.channels[channelId].bossRotation) {
    data.channels[channelId].bossRotation = defaultServerData().bossRotation;
}

if (!data.channels[channelId].channelConfig) {

    data.channels[channelId].channelConfig = {
        adcMode: 'single'
    };
}

if (!('ms11PanelMessageId' in data.channels[channelId])) {

    data.channels[channelId]
        .ms11PanelMessageId = null;
}

if (!data.channels[channelId].specialChambers) {

    data.channels[channelId].specialChambers =
        defaultServerData().specialChambers;
}

if (!data.channels[channelId].specialClaims) {

    data.channels[channelId].specialClaims = {};
}

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

    await saveData(data);
   
    return;
}
    const left =
        data.channels[channelId].adc.left;

    const center =
        data.channels[channelId].adc.center;

    const right =
        data.channels[channelId].adc.right;

    const left2 =
        data.channels[channelId].adc2.left;

    const center2 =
        data.channels[channelId].adc2.center;

    const right2 =
        data.channels[channelId].adc2.right;

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

    const bossesRotation =
    data.channels[channelId].bossRotation;

const bossSlots = [
    bossesRotation.slot1,
    bossesRotation.slot2,
    bossesRotation.slot3
];

const occupiedBoss =
    bossSlots.filter(x => x.ownerId).length;

    const occupied =
        [left, center, right]
        .filter(x => x.ownerId)
        .length;

    const occupied2 =
        [left2, center2, right2]
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

const adcMode =
    data.channels[channelId]
        ?.channelConfig
        ?.adcMode || 'single';

    const fields = [];

const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🐸 青蛙・341')
    .setDescription('Claim a chamber using the button below.')
    .setThumbnail('https://cdn.discordapp.com/attachments/1499493291706552340/1519576349843390565/341server.png?ex=6a3e0f42&is=6a3cbdc2&hm=c879d96d8edcd91b18dfecff4ba5ccabde5951b09647390152187bf9eeb73254&');

fields.push(
    {

    name: 'ㅤADC I-I STATUS',
    value: `🚦 ${occupied}/3 Occupied\n\u200B`,
    inline: false
},

{
    name: `${left.ownerId ? '🔴' : '🟢'} LEFT`,
    value:
`Status: ${left.ownerId ? 'OCCUPIED' : 'FREE'}
👤: ${left.owner || 'None'}
🎟: ${left.tickets}
⏰: ${getRemainingTime(left.expiresAt)}`,
    inline: true
},

{
    name: `${center.ownerId ? '🔴' : '🟢'} CENTER`,
    value:
`Status: ${center.ownerId ? 'OCCUPIED' : 'FREE'}
👤: ${center.owner || 'None'}
🎟: ${center.tickets}
⏰: ${getRemainingTime(center.expiresAt)}`,
    inline: true
},

{
    name: `${right.ownerId ? '🔴' : '🟢'} RIGHT`,
    value:
`Status: ${right.ownerId ? 'OCCUPIED' : 'FREE'}
👤: ${right.owner || 'None'}
🎟: ${right.tickets}
⏰: ${getRemainingTime(right.expiresAt)}`,
    inline: true
}

);

if (adcMode === 'dual') {

fields.push(

{
    name:
`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ㅤADC I-II STATUS`,
    value: `🚦 ${occupied2}/3 Occupied\n\u200B`,
    inline: false
},

{
    name: `${left2.ownerId ? '🔴' : '🟢'} LEFT`,
    value:
`Status: ${left2.ownerId ? 'OCCUPIED' : 'FREE'}
👤: ${left2.owner || 'None'}
🎟: ${left2.tickets}
⏰: ${getRemainingTime(left2.expiresAt)}`,
    inline: true
},

{
    name: `${center2.ownerId ? '🔴' : '🟢'} CENTER`,
    value:
`Status: ${center2.ownerId ? 'OCCUPIED' : 'FREE'}
👤: ${center2.owner || 'None'}
🎟: ${center2.tickets}
⏰: ${getRemainingTime(center2.expiresAt)}`,
    inline: true
},

{
    name: `${right2.ownerId ? '🔴' : '🟢'} RIGHT`,
    value:
`Status: ${right2.ownerId ? 'OCCUPIED' : 'FREE'}
👤: ${right2.owner || 'None'}
🎟: ${right2.tickets}
⏰: ${getRemainingTime(right2.expiresAt)}`,
    inline: true
}

);

}

fields.push(

{
    name:
`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${occupiedBoss > 0 ? '🔴' : '🟢'} BOSS ROTATION & MINING/GATHERING`,
    value:
`🚦 ${occupiedBoss}/3 Occupied

👤: ${bossesRotation.slot1.owner || 'Free'}${
    bossesRotation.slot1.owner
        ? `\n   ⏰: ${getRemainingTime(bossesRotation.slot1.expiresAt)}`
        : ''
}
👤: ${bossesRotation.slot2.owner || 'Free'}${
    bossesRotation.slot2.owner
        ? `\n   ⏰: ${getRemainingTime(bossesRotation.slot2.expiresAt)}`
        : ''
}
👤: ${bossesRotation.slot3.owner || 'Free'}${
    bossesRotation.slot3.owner
        ? `\n   ⏰: ${getRemainingTime(bossesRotation.slot3.expiresAt)}`
        : ''
}

${getBossStatus(bosses.leader1).icon} Leader I - ${getBossStatus(bosses.leader1).text}
${getBossStatus(bosses.leader2).icon} Leader II - ${getBossStatus(bosses.leader2).text}
${getBossStatus(bosses.leader3).icon} Leader III - ${getBossStatus(bosses.leader3).text}
${getBossStatus(bosses.goldOre).icon} Gold Ore - ${getBossStatus(bosses.goldOre).text}
${getBossStatus(bosses.goldHerb).icon} Gold Herb - ${getBossStatus(bosses.goldHerb).text}
${getBossStatus(bosses.sealingChamber).icon} Sealing Chamber - ${getBossStatus(bosses.sealingChamber).text}

*⏱️ Panel updates every 15 seconds.*`,
    inline: false
}

);

embed.addFields(fields);

try {

    await panelMessage.edit({
    embeds: [embed],
    components: panelMessage.components ?? []
});

} catch (err) {

    console.error('[UPDATE PANEL ERROR]', err);

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

// MS11 PANEL

async function updateMS11Panel(channel, data = null) {

    data ??= loadData();

    const channelId = channel.id;

    if (!data.channels[channelId]) return;

    if (!data.channels[channelId].specialChambers) {

    data.channels[channelId]
        .specialChambers =
        defaultServerData()
            .specialChambers;
}

    const panelMessageId =
        data.channels[channelId]
            .ms11PanelMessageId;

    if (!panelMessageId) return;

    const chambers =
        data.channels[channelId]
            .specialChambers;

    const frenzy = chambers.frenzy;
    const fury = chambers.fury;
    const lucky = chambers.lucky;
    const others = chambers.others;

    function getRemainingTime(expiresAt) {

    if (!expiresAt)
        return '--:--:--';

    const remaining =
        Math.max(
            0,
            expiresAt - Date.now()
        );

    const hours =
        Math.floor(
            remaining / 3600000
        );

    const minutes =
        Math.floor(
            (remaining % 3600000) / 60000
        );

    const seconds =
        Math.floor(
            (remaining % 60000) / 1000
        );

    return `${hours
        .toString()
        .padStart(2,'0')}:${minutes
        .toString()
        .padStart(2,'0')}:${seconds
        .toString()
        .padStart(2,'0')}`;
}

function formatMS11Claims(chamber) {

    if (
        !chamber.claims ||
        chamber.claims.length === 0
    ) {

        return '👤: Free';
    }

    return chamber.claims
        .map(claim =>
`👤: ${claim.owner}
⏰: ${getRemainingTime(
    claim.expiresAt
)}`
        )
        .join('\n\n');
}

const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🐸 青蛙・341')
    .setDescription('Claim a chamber using the button below.')
    .setThumbnail(
        'https://cdn.discordapp.com/attachments/1499493291706552340/1519576349843390565/341server.png'
    )
    .addFields(

{
    name:
        `${frenzy.claims.length ? '🔴' : '🟢'} Frenzy Chamber`,
    value:
        formatMS11Claims(frenzy),
    inline: false
},

{
    name:
        `${fury.claims.length ? '🔴' : '🟢'} Fury Chamber`,
    value:
        formatMS11Claims(fury),
    inline: false
},

{
    name:
        `${lucky.claims.length ? '🔴' : '🟢'} Lucky Chamber`,
    value:
        formatMS11Claims(lucky),
    inline: false
},

{
    name:
        `${others.claims.length ? '🔴' : '🟢'} Others Chamber`,
    value:
        formatMS11Claims(others),
    inline: false
}

);

let panelMessage;

try {

    panelMessage =
        await channel.messages.fetch(
            panelMessageId
        );

} catch (err) {

    console.log(
        `[MS11 PANEL NOT FOUND] ${channelId}`
    );

    return;
}

try {

    await panelMessage.edit({
        embeds: [embed]
    });

} catch (err) {

    console.error(
        '[MS11 UPDATE ERROR]',
        err
    );
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

    const ownsBossRotation =
    Object.values(
        data.channels[channelId]
            .bossRotation || {}
    )
    .find(slot =>
    slot?.ownerId === userId
);

    if (ownsBossRotation) {

        existingClaim = {
            type: 'Boss Rotation'
        };
    }
}

if (!existingClaim) {

    const adcOwned =
    Object.values(data.channels[channelId].adc)
        .find(spot => spot.ownerId === userId) ||

    Object.values(data.channels[channelId].adc2)
        .find(spot => spot.ownerId === userId);;

    if (adcOwned) {
        const adc1Spot =
    Object.keys(data.channels[channelId].adc)
        .find(key =>
            data.channels[channelId].adc[key].ownerId === userId
        );

const adc2Spot =
    Object.keys(data.channels[channelId].adc2)
        .find(key =>
            data.channels[channelId].adc2[key].ownerId === userId
        );

if (adc1Spot) {

    existingClaim = {
        type: `ADC I-I ${adc1Spot.toUpperCase()}`
    };

} else if (adc2Spot) {

    existingClaim = {
        type: `ADC I-II ${adc2Spot.toUpperCase()}`
    };
}

    }
}

if (existingClaim) {

    return interaction.reply({
        content:
`❌ You already own ${existingClaim.type}. Use your claim panel.`,
        flags: 64
    });
}

const options = [

{
    label: 'ADC I-I',
    value: 'adc1'
}

];

const adcMode =
    data.channels[channelId]
        ?.channelConfig
        ?.adcMode || 'single';

if (adcMode === 'dual') {

    options.push({

        label: 'ADC I-II',
        value: 'adc2'
    });
}

options.push({

    label: 'Boss Rotation & Mining/Gathering',
    value: 'boss'
});

const chamberMenu =
new StringSelectMenuBuilder()
.setCustomId('claimtype')
.setPlaceholder('Select Chamber Type')
.addOptions(options);

const menuRow =
new ActionRowBuilder()
.addComponents(chamberMenu);

await interaction.reply({
    content: 'Select Chamber Type',
    components: [menuRow],
    flags: 64
});
    }

if (interaction.customId === 'ms11_claim') {

    const data = loadData();

    const channelId =
        interaction.channel.id;

    if (!data.channels[channelId]) {

        return interaction.reply({
            content: 'Panel not initialized.',
            flags: 64
        });
    }

    const existingClaim =
        data.channels[channelId]
            ?.specialClaims?.[
                interaction.user.id
            ];

    if (existingClaim) {

        return interaction.reply({
            content:
                '❌ You already own a MS11 chamber.',
            flags: 64
        });
    }

    const menu =
        new StringSelectMenuBuilder()

        .setCustomId('ms11_chamber')

        .setPlaceholder(
            'Select Chamber'
        )

        .addOptions(

            {
                label: 'Frenzy',
                value: 'frenzy'
            },

            {
                label: 'Fury',
                value: 'fury'
            },

            {
                label: 'Lucky',
                value: 'lucky'
            },

            {
                label: 'Others',
                value: 'others'
            }
        );

    const row =
        new ActionRowBuilder()
            .addComponents(menu);

    return interaction.reply({

        content:
            'Select a chamber.',

        components: [row],

        flags: 64
    });
}

// END CLAIM

if (interaction.customId === 'endclaim') {

    const data = loadData();
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    const specialClaim =
    data.channels[channelId]
        ?.specialClaims?.[userId];

    if (!data.channels[channelId]) {
        return interaction.reply({
            content: '❌ Panel data missing.',
            flags: 64
        });
    }

    data.channels[channelId].userClaims ??= {};

    const claim =
        data.channels[channelId]
            .userClaims[userId];

    if (specialClaim) {

    const chamber =
    data.channels[channelId]
        .specialChambers[
            specialClaim.chamber
        ];

    if (chamber?.claims) {

    chamber.claims =
        chamber.claims.filter(
            x => x.ownerId !== userId
        );
}

    console.log(
    '[MS11 CLAIMS LEFT]',
    chamber.claims.length
);

    if (specialClaim.claimPanelMessageId) {

    try {

        const msg =
            await interaction.channel.messages.fetch(
                specialClaim.claimPanelMessageId
            );

        await msg.delete();

    } catch {}
}

    delete data.channels[channelId]
        .specialClaims[userId];

    console.log(
    `[MS11 END] ${interaction.member.displayName} | ${specialClaim.chamber.toUpperCase()}`
);

    await saveData(data);

    await updateMS11Panel(
        interaction.channel
    );

    return interaction.reply({
        content:
            `✅ ${specialClaim.chamber.toUpperCase()} released.`,
        flags: 64
    });
}

    if (!claim) {
        return interaction.reply({
            content: 'No active claim found.',
            flags: 64
        });
    }

    if (claim?.claimPanelMessageId) {
        try {
            const msg =
                await interaction.channel.messages.fetch(
                    claim.claimPanelMessageId
                );

            await msg.delete();
        } catch {}
    }

    // BOSS ROTATION
    if (claim.chamberType === 'boss') {

        const slot =
            data.channels[channelId]
                .bossRotation?.[claim.bossSlot];

        if (slot) {
            slot.owner = null;
            slot.ownerId = null;
            slot.tickets = 0;
            slot.expiresAt = null;
        }

        delete data.channels[channelId]
            .userClaims[userId];

        await saveData(data);

        await updatePanel(interaction.channel);

        return interaction.reply({
            content: '✅ Boss Rotation released.',
            flags: 64
        });
    }

    // ADC / ADC2
    if (claim.spot) {

        const releasedSpot = claim.spot;

        let adcSpot;

        if (claim.chamberType === 'adc') {

            adcSpot =
                data.channels[channelId]
                    .adc[releasedSpot];

        } else if (claim.chamberType === 'adc2') {

            adcSpot =
                data.channels[channelId]
                    .adc2[releasedSpot];
        }

        if (adcSpot) {

            adcSpot.owner = null;
            adcSpot.ownerId = null;
            adcSpot.tickets = 0;
            adcSpot.expiresAt = null;
        }

        let releasedName;

if (claim.chamberType === 'adc') {

    releasedName =
        `ADC I-I ${releasedSpot.toUpperCase()}`;

} else if (claim.chamberType === 'adc2') {

    releasedName =
        `ADC I-II ${releasedSpot.toUpperCase()}`;

} else {

    releasedName =
        claim.type;
}

await sendAutoDelete(
    interaction.channel,
    `🟢 ${releasedName} is now available.`
);

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

        return interaction.reply({
            content: '✅ Claim ended.',
            flags: 64
        });
    }

}

// SWAP CLAIM

   if (interaction.customId === 'swapclaim') {

    const data = loadData();
const channelId = interaction.channel.id;
const userId = interaction.user.id;

const specialClaim =
    data.channels[channelId]
        ?.specialClaims?.[userId];

if (specialClaim) {

    const menu =
        new StringSelectMenuBuilder()

            .setCustomId('ms11_swap')

            .setPlaceholder(
                'Select New Chamber'
            )

            .addOptions(
                {
                    label: 'Frenzy',
                    value: 'frenzy'
                },
                {
                    label: 'Fury',
                    value: 'fury'
                },
                {
                    label: 'Lucky',
                    value: 'lucky'
                },
                {
                    label: 'Others',
                    value: 'others'
                }
            );

    const row =
        new ActionRowBuilder()
            .addComponents(menu);

    return interaction.reply({

        content:
            'Select new MS11 chamber.',

        components: [row],

        flags: 64
    });
}

if (!data.channels[channelId]) {

    return interaction.reply({
        content: '❌ Panel data missing.',
        flags: 64
    });

}

data.channels[channelId].userClaims ??= {};

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
        ?.userClaims?.[userId];

if (!claim) {

    return interaction.reply({
        content: '❌ You do not have an active claim.',
        flags: 64
    });

}

let options = [];

if (
    claim.chamberType === 'adc' ||
    claim.chamberType === 'adc2'
) {

    options.push(
        {
            label: 'ADC I-I',
            value: 'adc1'
        },
        {
            label: 'ADC I-II',
            value: 'adc2'
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
            label: 'ADC I-I',
            value: 'adc1'
        },
        {
            label: 'ADC I-II',
            value: 'adc2'
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
await interaction.deferReply({ flags: 64 });

    const data = loadData();
    const channelId = interaction.channel.id;

    const bossRotation =
    data.channels[channelId].bossRotation;

const ownsBossRotation =
    Object.values(bossRotation)
        .some(slot => slot && slot.ownerId === interaction.user.id);

if (!ownsBossRotation) {
    return interaction.editReply({
        content: '❌ Only the Boss Rotation owner can mark bosses.'
    });
}

    const leader1 =
        data.channels[channelId].bosses.leader1;

    if (
        leader1.expiresAt &&
        Date.now() < leader1.expiresAt
    ) {

        return interaction.editReply({
    content: '❌ Leader I is already on cooldown.'
});
    }

    leader1.expiresAt =
        Date.now() + (30 * 60 * 1000);

    await saveData(data);

    await updatePanel(interaction.channel);

    await interaction.editReply({
    content:
        '✅ Leader I marked. Respawn timer starts.'
});

    return;
}

if (interaction.customId === 'leader2') {
await interaction.deferReply({ flags: 64 });

    const data = loadData();
    const channelId = interaction.channel.id;

    const bossRotation =
    data.channels[channelId].bossRotation;

const ownsBossRotation =
    Object.values(bossRotation)
        .some(slot => slot && slot.ownerId === interaction.user.id);

if (!ownsBossRotation) {
    return interaction.editReply({
        content: '❌ Only the Boss Rotation owner can mark bosses.'
    });
}

    const leader2 =
        data.channels[channelId].bosses.leader2;

    if (
        leader2.expiresAt &&
        Date.now() < leader2.expiresAt
    ) {

        return interaction.editReply({
    content: '❌ Leader II is already on cooldown.'
});
    }

    leader2.expiresAt =
        Date.now() + (60 * 60 * 1000);

    await saveData(data);

    await updatePanel(interaction.channel);

    await interaction.editReply({
    content:
        '✅ Leader II marked. Respawn timer starts.'
});

    return;
}

if (interaction.customId === 'leader3') {
await interaction.deferReply({ flags: 64 });

    const data = loadData();
    const channelId = interaction.channel.id;

    const bossRotation =
    data.channels[channelId].bossRotation;

const ownsBossRotation =
    Object.values(bossRotation)
        .some(slot => slot && slot.ownerId === interaction.user.id);

if (!ownsBossRotation) {
    return interaction.editReply({
        content: '❌ Only the Boss Rotation owner can mark bosses.'
    });
}

    const leader3 =
        data.channels[channelId].bosses.leader3;

    if (
        leader3.expiresAt &&
        Date.now() < leader3.expiresAt
    ) {

        return interaction.editReply({
    content: '❌ Leader III is already on cooldown.'
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

    await interaction.editReply({
    content:
        '✅ Leader III marked. Respawn timer starts.'
});

    return;
}

if (interaction.customId === 'goldore') {
await interaction.deferReply({ flags: 64 });

    const data = loadData();
    const channelId = interaction.channel.id;

    const bossRotation =
    data.channels[channelId].bossRotation;

const ownsBossRotation =
    Object.values(bossRotation)
        .some(slot => slot && slot.ownerId === interaction.user.id);

if (!ownsBossRotation) {
    return interaction.editReply({
        content: '❌ Only the Boss Rotation owner can mark bosses.',
    });
}

    const goldOre =
        data.channels[channelId].bosses.goldOre;

    if (
        goldOre.expiresAt &&
        Date.now() < goldOre.expiresAt
    ) {

        return interaction.editReply({
            content:
                '❌ Gold Ore is already on cooldown.',
        });
    }

    goldOre.expiresAt =
        Date.now() + (31 * 60 * 1000);

    await saveData(data);

    await updatePanel(interaction.channel);

    await interaction.editReply({
    content:
        '✅ Gold Ore marked. Respawn timer starts.'
});

    return;
}

if (interaction.customId === 'goldherb') {
await interaction.deferReply({ flags: 64 });

    const data = loadData();
    const channelId = interaction.channel.id;

    const bossRotation =
    data.channels[channelId].bossRotation;

const ownsBossRotation =
    Object.values(bossRotation)
        .some(slot => slot && slot.ownerId === interaction.user.id);

if (!ownsBossRotation) {
    return interaction.editReply({
        content: '❌ Only the Boss Rotation owner can mark bosses.',
    });
}

    const goldHerb =
        data.channels[channelId].bosses.goldHerb;

    if (
        goldHerb.expiresAt &&
        Date.now() < goldHerb.expiresAt
    ) {

        return interaction.editReply({
            content:
                '❌ Gold Herb is already on cooldown.',
        });
    }

    goldHerb.expiresAt =
        Date.now() + (31 * 60 * 1000);

    await saveData(data);

    await updatePanel(interaction.channel);

    await interaction.editReply({
    content:
        '✅ Gold Herb marked. Respawn timer starts.'
});

    return;
}

if (interaction.customId === 'sealingchamber') {
await interaction.deferReply({ flags: 64 });

    const data = loadData();
    const channelId = interaction.channel.id;

    const sealingChamber =
        data.channels[channelId].bosses.sealingChamber;

    if (
        sealingChamber.expiresAt &&
        Date.now() < sealingChamber.expiresAt
    ) {

        return interaction.editReply({
            content:
                '❌ Sealing Chamber is already on cooldown.',
        });
    }

    sealingChamber.expiresAt =
        Date.now() + (31 * 60 * 1000);

    await saveData(data);

    await updatePanel(interaction.channel);

    await interaction.editReply({
    content:
        '✅ Sealing Chamber marked. Respawn timer starts.'
});

    return;
}

}

// Select Menu

if (interaction.isStringSelectMenu()) {

// MS 11 Swap

if (interaction.customId === 'ms11_swap') {

    const data = loadData();

    const channelId =
        interaction.channel.id;

    const userId =
        interaction.user.id;

    const newChamber =
        interaction.values[0];

    const specialClaim =
        data.channels[channelId]
            ?.specialClaims?.[userId];

    if (!specialClaim) {

        return interaction.reply({
            content:
                '❌ No MS11 claim found.',
            flags: 64
        });
    }

    const oldChamber =
        specialClaim.chamber;

    if (oldChamber === newChamber) {

        return interaction.reply({
            content:
                '❌ Already in that chamber.',
            flags: 64
        });
    }

    const oldList =
        data.channels[channelId]
            .specialChambers[
                oldChamber
            ].claims;

    const claim =
        oldList.find(
            x => x.ownerId === userId
        );

    if (!claim) {

        return interaction.reply({
            content:
                '❌ Claim record missing.',
            flags: 64
        });
    }

    data.channels[channelId]
        .specialChambers[
            oldChamber
        ].claims =
            oldList.filter(
                x => x.ownerId !== userId
            );

    data.channels[channelId]
        .specialChambers[
            newChamber
        ].claims.push(claim);

    specialClaim.chamber =
        newChamber;

    if (specialClaim.claimPanelMessageId) {

    try {

        const panel =
            await interaction.channel.messages.fetch(
                specialClaim.claimPanelMessageId
            );

        await panel.edit({

            content:
`👤 ${interaction.user}

🏠 Chamber: ${newChamber.toUpperCase()}
🎟️ Tickets: ${claim.tickets}`,

            components: [
                new ActionRowBuilder().addComponents(

                    new ButtonBuilder()
                        .setCustomId('swapclaim')
                        .setLabel('🔄 Swap Chamber')
                        .setStyle(ButtonStyle.Primary),

                    new ButtonBuilder()
                        .setCustomId('endclaim')
                        .setLabel('❌ End Claim')
                        .setStyle(ButtonStyle.Danger)
                )
            ]
        });

    } catch (err) {

        console.log(
            '[MS11 PANEL EDIT FAILED]',
            err.message
        );
    }
}

    await saveData(data);

    await updateMS11Panel(
        interaction.channel
    );

    return interaction.update({

        content:
`✅ Swapped to ${newChamber.toUpperCase()}`,

        components: []
    });
}

// MS 11 Menu

   if (interaction.customId === 'ms11_chamber') {

    const chamber =
        interaction.values[0];

    const ticketMenu =
        new StringSelectMenuBuilder()

        .setCustomId(
            `ms11_ticket_${chamber}`
        )

        .setPlaceholder(
            'Select Ticket Count'
        )

        .addOptions(

            {
                label: '1 Ticket',
                value: '1'
            },

            {
                label: '2 Tickets',
                value: '2'
            },

            {
                label: '3 Tickets',
                value: '3'
            },

            {
                label: '4 Tickets',
                value: '4'
            },

            {
                label: '5 Tickets',
                value: '5'
            }
        );

    const row =
        new ActionRowBuilder()
            .addComponents(ticketMenu);

    return interaction.update({

        content:
            `Selected: ${chamber.toUpperCase()}\n\nSelect ticket count.`,

        components: [row]
    });
}

// MS 11 Ticket

    if (interaction.customId.startsWith('ms11_ticket_')) {

    const data = loadData();

    const channelId =
        interaction.channel.id;

    const userId =
        interaction.user.id;

    const chamber =
        interaction.customId.replace(
            'ms11_ticket_',
            ''
        );

    const tickets =
        Number(
            interaction.values[0]
        );

    if (
        !data.channels[channelId]
            .specialClaims
    ) {

        data.channels[channelId]
            .specialClaims = {};
    }

    if (
        data.channels[channelId]
            .specialClaims[userId]
    ) {

        return interaction.reply({
            content:
                '❌ You already own a MS11 chamber.',
            flags: 64
        });
    }

    const selectedChamber =
    data.channels[channelId]
        .specialChambers[chamber];

    selectedChamber.claims.push({

    owner:
        interaction.member.displayName,

    ownerId:
        userId,

    tickets,

    expiresAt:
        Date.now() + (tickets * 30 * 60 * 1000),

    claimPanelMessageId:
        null
});

    data.channels[channelId]
    .specialClaims[userId] = {

    chamber,
    tickets,

    expiresAt:
        Date.now() + (tickets * 30 * 60 * 1000)
};

    await saveData(data);

await updateMS11Panel(
    interaction.channel,
    data
);

const userPanelRow =
    new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `claim_swap_${userId}`
                )
                .setLabel('🔄 Swap Chamber')
                .setStyle(
                    ButtonStyle.Primary
                ),

            new ButtonBuilder()
                .setCustomId(
                    `claim_end_${userId}`
                )
                .setLabel('❌ End Claim')
                .setStyle(
                    ButtonStyle.Danger
                )
        );

const claimPanel =
    await interaction.channel.send({

        content:
`👤 ${interaction.user}

🏠 Chamber: ${chamber.toUpperCase()}
🎟 Tickets: ${tickets}`,

        components: [userPanelRow]
    });

const claimRecord =
    selectedChamber.claims.find(
        c => c.ownerId === userId
    );

if (claimRecord) {

    claimRecord.claimPanelMessageId =
        claimPanel.id;
}

data.channels[channelId]
    .specialClaims[userId]
    .claimPanelMessageId =
    claimPanel.id;

await saveData(data);

console.log(
    `[MS11 CLAIM] ${interaction.member.displayName} | ${chamber.toUpperCase()} | ${tickets} ticket(s)`
);

return interaction.update({

    content:
`✅ Claimed ${chamber.toUpperCase()}
🎟 Tickets: ${tickets}`,

    components: []
});

}

// ADC 1

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

    const duration =
        tickets * 30 * 60 * 1000;

    data.channels[channelId].adc[spot].expiresAt =
        Date.now() + duration;

    data.channels[channelId].userClaims ??= {};

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
`${interaction.user} currently owns ADC I-I ${spot.toUpperCase()}.`,
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

try {

    await interaction.update({
        content: '✅ Claim successful.',
        components: []
    });

} catch (err) {

    console.log(
        '[CLAIM] Interaction expired before update.'
    );

}

return;

}

// ADC 2

if (interaction.customId.startsWith('tickets2_')) {


    const data = loadData();
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    const spot =
       interaction.customId.replace('tickets2_', '');

    const tickets =
        parseInt(interaction.values[0]);

    if (!data.channels[channelId]) {
        return interaction.reply({
            content: 'Panel not initialized.',
            flags: 64
        });
    }

 if (data.channels[channelId].adc2[spot].ownerId) {

    return interaction.reply({
    content:
        `❌ ADC ${spot.toUpperCase()} is already occupied.`,
        flags: 64
});

}

    data.channels[channelId].adc2[spot].owner =
    interaction.member.displayName;

    data.channels[channelId].adc2[spot].ownerId =
    userId;

    data.channels[channelId].adc2[spot].tickets =
    tickets;

    const duration =
        tickets * 30 * 60 * 1000;

    data.channels[channelId].adc2[spot].expiresAt =
        Date.now() + duration;

    data.channels[channelId].userClaims ??= {};

    data.channels[channelId].userClaims[userId] = {

    type: `ADC I-II ${spot.toUpperCase()}`,
    spot: spot,
    tickets: tickets,
    expiresAt: data.channels[channelId].adc2[spot].expiresAt,
    chamberType: 'adc2',
    claimPanelMessageId: null
   
 };

    await saveData(data);

    const claimPanel = await interaction.channel.send({
    content:
`${interaction.user} currently owns ADC I-II ${spot.toUpperCase()}.`,
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
`[CLAIM] ${interaction.member.displayName} claimed ADC I-II ${spot.toUpperCase()}`
);

await updatePanel(interaction.channel);

try {

    await interaction.update({
        content: '✅ Claim successful.',
        components: []
    });

} catch (err) {

    console.log(
        '[CLAIM] Interaction expired before update.'
    );

}

return;

}

}

if (interaction.customId === 'swap_claimtype') {

    const data = loadData();
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    if (!data.channels[channelId]) {

        return interaction.reply({
            content: '❌ Panel data missing.',
            flags: 64
        });

    }

    data.channels[channelId].userClaims ??= {};

    const claim =
        data.channels[channelId]
            .userClaims[userId];

    if (!claim) {

        return interaction.reply({
            content: '❌ Claim data missing.',
            flags: 64
        });

    }

    const selected =
        interaction.values[0];

    // ADC SWAP
    if (
    (
        claim.chamberType === 'adc' ||
        claim.chamberType === 'adc2' ||
        claim.chamberType === 'boss'
    ) &&
    selected === 'adc1'
) 
    {

    const options = [];

    if (!data.channels[channelId].adc.left.ownerId)
    {
        options.push({
            label: 'LEFT',
            value: 'left'
        });
    }

    if (!data.channels[channelId].adc.center.ownerId)
    {
        options.push({
            label: 'CENTER',
            value: 'center'
        });
    }

    if (!data.channels[channelId].adc.right.ownerId)
    {
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
    (
        claim.chamberType === 'adc' ||
        claim.chamberType === 'adc2' ||
        claim.chamberType === 'boss'
    ) &&
    selected === 'adc2'
) {

    const options = [];

    if (!data.channels[channelId].adc2.left.ownerId)
        options.push({ label: 'LEFT', value: 'left' });

    if (!data.channels[channelId].adc2.center.ownerId)
        options.push({ label: 'CENTER', value: 'center' });

    if (!data.channels[channelId].adc2.right.ownerId)
        options.push({ label: 'RIGHT', value: 'right' });

    if (!options.length) {

        return interaction.reply({
            content: '❌ No available ADC I-II spots.',
            flags: 64
        });

    }

    const adcMenu =
        new StringSelectMenuBuilder()
            .setCustomId('swap_adc2spot')
            .setPlaceholder('Select ADC I-II Plate')
            .addOptions(options);

    const row =
        new ActionRowBuilder()
            .addComponents(adcMenu);

    await interaction.update({
        content: 'Select ADC I-II Plate',
        components: [row]
    });

    return;
}


 if (
    claim.chamberType === 'adc' &&
    selected === 'boss'
) {
        const rotation =
    data.channels[channelId]
        .bossRotation;

let boss = null;
let bossSlot = null;

if (!rotation.slot1.ownerId) {

    boss = rotation.slot1;
    bossSlot = 'slot1';
}
else if (!rotation.slot2.ownerId) {

    boss = rotation.slot2;
    bossSlot = 'slot2';
}
else if (!rotation.slot3.ownerId) {

    boss = rotation.slot3;
    bossSlot = 'slot3';
}

if (!boss) {

    return interaction.reply({
        content:
            '❌ Boss Rotation is full.',
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

        boss.owner =
            interaction.member.displayName;

        boss.ownerId =
            userId;

        boss.tickets =
            claim.tickets;

        boss.expiresAt =
            claim.expiresAt;

        const previousType =
               claim.type;

        claim.type =
            'Boss Rotation';
        

        claim.chamberType =
    'boss';

claim.bossSlot =
    bossSlot;

delete claim.spot;

        await saveData(data);

        console.log(
`[SWAP] ${interaction.member.displayName} | ${previousType} -> Boss Rotation (${bossSlot.toUpperCase()})`
);

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
    selected === 'adc1'
  ) 
   {

    const options = [];

    if (!data.channels[channelId].adc.left.ownerId)
    {
        options.push({
            label: 'LEFT',
            value: 'left'
        });
    }

    if (!data.channels[channelId].adc.center.ownerId)
    {
        options.push({
            label: 'CENTER',
            value: 'center'
        });
    }

    if (!data.channels[channelId].adc.right.ownerId)
    {
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

if (
    claim.chamberType === 'adc2' &&
    selected === 'boss'
)
{
    const rotation =
    data.channels[channelId]
        .bossRotation;

let boss = null;
let bossSlot = null;

if (!rotation.slot1.ownerId) {

    boss = rotation.slot1;
    bossSlot = 'slot1';
}
else if (!rotation.slot2.ownerId) {

    boss = rotation.slot2;
    bossSlot = 'slot2';
}
else if (!rotation.slot3.ownerId) {

    boss = rotation.slot3;
    bossSlot = 'slot3';
}

if (!boss) {

    return interaction.reply({
        content:
            '❌ Boss Rotation is full.',
        flags: 64
    });
}

    const oldSpot = claim.spot;

    const adc =
        data.channels[channelId].adc2[oldSpot];

    adc.owner = null;
    adc.ownerId = null;
    adc.tickets = 0;
    adc.expiresAt = null;

    boss.owner =
        interaction.member.displayName;

    boss.ownerId =
        userId;

    boss.tickets =
        claim.tickets;

    boss.expiresAt =
        claim.expiresAt;

    const previousType =
    claim.type;

    claim.type =
        'Boss Rotation';

    claim.chamberType =
        'boss';

    claim.bossSlot =
    bossSlot;

    delete claim.spot;

    await saveData(data);

console.log(
    `[SWAP] ${interaction.member.displayName} | ${previousType} -> Boss Rotation (${bossSlot.toUpperCase()})`
);

    if (claim.claimPanelMessageId) {

    try {

        const panelMessage =
            await interaction.channel.messages.fetch(
                claim.claimPanelMessageId
            );

        await panelMessage.edit({
            content:
`${interaction.user} currently owns Boss Rotation.`
        });

    } catch (err) {

        console.log(
            '[SWAP PANEL UPDATE FAILED]',
            err
        );
    }
}

    await updatePanel(interaction.channel);

    await interaction.update({
        content: '✅ Swap successful.',
        components: []
    });

    return;
}

    if (
    claim.chamberType === 'boss' &&
    selected === 'adc2'
)
{

    const options = [];

    if (!data.channels[channelId].adc2.left.ownerId)
        options.push({ label: 'LEFT', value: 'left' });

    if (!data.channels[channelId].adc2.center.ownerId)
        options.push({ label: 'CENTER', value: 'center' });

    if (!data.channels[channelId].adc2.right.ownerId)
        options.push({ label: 'RIGHT', value: 'right' });

    if (!options.length) {

        return interaction.reply({
            content: '❌ No available ADC I-II spots.',
            flags: 64
        });

    }

    const adcMenu =
        new StringSelectMenuBuilder()
            .setCustomId('swap_adc2spot')
            .setPlaceholder('Select ADC I-II Plate')
            .addOptions(options);

    const row =
        new ActionRowBuilder()
            .addComponents(adcMenu);

    await interaction.update({
        content: 'Select ADC I-II Plate',
        components: [row]
    });

    return;
}

return interaction.reply({
    content: `❌ Missing swap handler (${claim.chamberType} → ${selected})`,
    flags: 64
});

}

    if (interaction.customId === 'claimtype') {

        const choice = interaction.values[0];

        if (choice === 'adc1') {

    const adcMenu =
        new StringSelectMenuBuilder()
        .setCustomId('adcspot1')
        .setPlaceholder('Select ADC I-I Plate')
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
    content: 'Select ADC I-I Plate',
    components: [row]
});

    return;
}

if (choice === 'adc2') {

    const adcMenu =
        new StringSelectMenuBuilder()
        .setCustomId('adcspot2')
        .setPlaceholder('Select ADC I-II Plate')
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
    content: 'Select ADC I-II Plate',
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
});

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

    const userId = interaction.user.id;

const claim =
    data.channels[channelId].userClaims[userId];

if (!claim) {

    await interaction.editReply({
        content: 'No active claim found.'
    });

    return;
}

const previousType =
    claim.type;

console.log(
`[SWAP] ${interaction.member.displayName} | ${previousType} -> ADC I-I ${spot.toUpperCase()}`
);

if (claim.chamberType === 'adc') {

    const oldSpot = claim.spot;

    data.channels[channelId].adc[oldSpot].owner = null;
    data.channels[channelId].adc[oldSpot].ownerId = null;
    data.channels[channelId].adc[oldSpot].tickets = 0;
    data.channels[channelId].adc[oldSpot].expiresAt = null;

}

else if (claim.chamberType === 'adc2') {

    const oldSpot = claim.spot;

    data.channels[channelId].adc2[oldSpot].owner = null;
    data.channels[channelId].adc2[oldSpot].ownerId = null;
    data.channels[channelId].adc2[oldSpot].tickets = 0;
    data.channels[channelId].adc2[oldSpot].expiresAt = null;

}

else if (claim.chamberType === 'boss') {

    const boss =
        data.channels[channelId]
            .bossRotation[
                claim.bossSlot
            ];

    if (boss) {

        boss.owner = null;
        boss.ownerId = null;
        boss.tickets = 0;
        boss.expiresAt = null;
    }

    delete claim.bossSlot;
}

data.channels[channelId].adc[spot] = {
    owner: interaction.member.displayName,
    ownerId: userId,
    tickets: claim.tickets,
    expiresAt: claim.expiresAt
};

claim.spot = spot;
claim.type = `ADC I-I ${spot.toUpperCase()}`
claim.chamberType = 'adc';

await addCooldown(
    data,
    channelId,
    userId
);

const fromLocation =
    claim.type;

console.log(
`[SWAP] ${interaction.member.displayName} | ${fromLocation} -> ADC I-I ${spot.toUpperCase()}`
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
`${interaction.user} currently owns ADC I-I ${spot.toUpperCase()}.`
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

if (interaction.customId === 'swap_adc2spot') {

await interaction.update({
    content: '⏳ Swapping...',
    components: []
});

    const spot = interaction.values[0];

    const data = loadData();
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;

    const claim =
        data.channels[channelId].userClaims[userId];

    if (!claim) {

        await interaction.followUp({
    content: '❌ No active claim found.',
    ephemeral: true
});

return;

    }

    const previousType =
    claim.type;

    if (data.channels[channelId].adc2[spot].ownerId) {

        await interaction.followUp({
    content: '❌ Spot already occupied.',
    ephemeral: true
});

return;

    }

if (claim.chamberType === 'adc') {

    const oldSpot = claim.spot;

    data.channels[channelId].adc[oldSpot].owner = null;
    data.channels[channelId].adc[oldSpot].ownerId = null;
    data.channels[channelId].adc[oldSpot].tickets = 0;
    data.channels[channelId].adc[oldSpot].expiresAt = null;

}

else if (claim.chamberType === 'adc2') {

    const oldSpot = claim.spot;

    data.channels[channelId].adc2[oldSpot].owner = null;
    data.channels[channelId].adc2[oldSpot].ownerId = null;
    data.channels[channelId].adc2[oldSpot].tickets = 0;
    data.channels[channelId].adc2[oldSpot].expiresAt = null;

}

else if (claim.chamberType === 'boss') {

    const boss =
        data.channels[channelId]
            .bossRotation[
                claim.bossSlot
            ];

    if (boss) {

        boss.owner = null;
        boss.ownerId = null;
        boss.tickets = 0;
        boss.expiresAt = null;
    }

    delete claim.bossSlot;
}

    data.channels[channelId].adc2[spot] = {
        owner: interaction.member.displayName,
        ownerId: userId,
        tickets: claim.tickets,
        expiresAt: claim.expiresAt
    };

    claim.spot = spot;
    claim.type = `ADC I-II ${spot.toUpperCase()}`;
    claim.chamberType = 'adc2';

    await saveData(data);

    console.log(
`[SWAP] ${interaction.member.displayName} | ${previousType} -> ADC I-II ${spot.toUpperCase()}`
);

const panelId = claim.claimPanelMessageId;

if (panelId) {

    try {

        const panel =
            await interaction.channel.messages.fetch(
                panelId
            );

        await panel.edit({
            content:
`${interaction.user} currently owns ADC I-II ${spot.toUpperCase()}.`
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

    const tickets =
        parseInt(interaction.values[0]);

    const rotation =
    data.channels[channelId].bossRotation;

    const alreadyOwnsBoss =
    Object.values(rotation)
        .some(slot =>
            slot?.ownerId === userId
        );

if (alreadyOwnsBoss) {

    await interaction.editReply({
        content:
            '❌ You already own Boss Rotation.'
    });

    return;
}

let boss = null;
let bossSlot = null;

if (!rotation.slot1.ownerId) {
    boss = rotation.slot1;
    bossSlot = 'slot1';
}
else if (!rotation.slot2.ownerId) {
    boss = rotation.slot2;
    bossSlot = 'slot2';
}
else if (!rotation.slot3.ownerId) {
    boss = rotation.slot3;
    bossSlot = 'slot3';
}

if (!boss) {

    return interaction.reply({
        content:
            '❌ Boss Rotation & Mining/Gathering is full.',
        flags: 64
    });
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
    bossSlot: bossSlot,
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
            .bossRotation[
                claim.bossSlot
            ];

    if (boss) {

        boss.tickets =
            claim.tickets;

        boss.expiresAt =
            claim.expiresAt;
    }
}

    if (claim.chamberType === 'adc') {

    const adc =
        data.channels[channelId]
            .adc[
                claim.spot.replace('adc_', '')
            ];

    adc.tickets =
        claim.tickets;

    adc.expiresAt =
        claim.expiresAt;
}

    if (claim.chamberType === 'adc2') {

    const adc =
        data.channels[channelId]
            .adc2[
                claim.spot.replace('adc2_', '')
            ];

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

    if (interaction.customId === 'adcspot1') {

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


 if (interaction.customId === 'adcspot2') {

    const data = loadData();
    const channelId = interaction.channel.id;

    const spot = interaction.values[0];

    const adc =
    data.channels[channelId].adc2[spot];

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

    const ticketMenu =
        new StringSelectMenuBuilder()
        .setCustomId(`tickets2_${spot}`)
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
    content: `ADC I-II Plate Selected: ${spot.toUpperCase()}`,
    components: [row]
});

    return;
  }


if (!interaction.isChatInputCommand()) return;

const data = loadData();
const channelId = interaction.channel.id;

if (interaction.commandName === 'setup') {

  await interaction.deferReply({ ephemeral: true });

const data = loadData();
const channelId = interaction.channel.id;

const existing = data.channels[channelId];

if (existing?.panelMessageId) {
    try {
        const channel = await interaction.channel.messages.fetch(existing.panelMessageId);
        if (channel) {
            return interaction.reply({
                content: "❌ Panel already exists.",
                flags: 64
            });
        }
    } catch {}
}

data.channels[channelId] =
    defaultServerData();

const embed = new EmbedBuilder()
.setColor(0x57F287)
.setTitle('🐸 青蛙・341')
.setDescription('Loading panel...');

// BUTTONS

const row1 = new ActionRowBuilder()
.addComponents(

    new ButtonBuilder()
        .setCustomId('claim')
        .setLabel('⚔ Claim')
        .setStyle(ButtonStyle.Success),

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
    .setStyle(ButtonStyle.Success),

new ButtonBuilder()
    .setCustomId('sealingchamber')
    .setLabel('🔒 Sealing Chamber')
    .setStyle(ButtonStyle.Success)
);


const panelMessage = await interaction.channel.send({
    embeds: [embed],
    components: [row1, row2, row3]
});

data.channels[channelId].panelMessageId = panelMessage.id;

await saveData(data);

await updatePanel(interaction.channel);

console.log(
    '[SETUP]',
    interaction.replied,
    interaction.deferred
);

    return await interaction.editReply({
    content: 'Panel created.'
});
}

// MS11 Panel

if (interaction.commandName === 'setupms11') {

  await interaction.deferReply({ flags: 64 });

const data = loadData();
const channelId = interaction.channel.id;

const existing = data.channels[channelId];

if (existing?.ms11PanelMessageId) {
    try {
        const channel = await interaction.channel.messages.fetch(
    existing.ms11PanelMessageId
);
        if (channel) {
            return interaction.reply({
                content: "❌ Panel already exists.",
                flags: 64
            });
        }
    } catch {}
}

if (!data.channels[channelId]) {

    data.channels[channelId] =
        defaultServerData();

}

const embed = new EmbedBuilder()
.setColor(0x57F287)
.setTitle('🐸 青蛙・341 MS11')
.setDescription('Loading MS11 panel...');

// BUTTONS

const row1 = new ActionRowBuilder()
.addComponents(

    new ButtonBuilder()
        .setCustomId('ms11_claim')
        .setLabel('⚔ Claim Chamber')
        .setStyle(ButtonStyle.Success)
);

const panelMessage = await interaction.channel.send({
    embeds: [embed],
    components: [row1]
});

data.channels[channelId].ms11PanelMessageId =
    panelMessage.id;

await saveData(data);

await updateMS11Panel(interaction.channel);

console.log(
    '[SETUP]',
    interaction.replied,
    interaction.deferred
);

    return await interaction.editReply({
    content: 'Panel created.'
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

data.channels[channelId].panelMessageId =
    null;

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

const ms11PanelId =
    data.channels[channelId].ms11PanelMessageId;

data.channels[channelId] =
    defaultServerData();

data.channels[channelId].panelMessageId =
    panelId;

data.channels[channelId].ms11PanelMessageId =
    ms11PanelId;

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

   if (target.startsWith('boss_')) {

    const slotName =
        target.replace('boss_', '');

    const boss =
        data.channels[channelId]
            .bossRotation?.[slotName];

    if (!boss) {

        return interaction.reply({
            content: '❌ Invalid boss slot.',
            flags: 64
        });
    }

    if (boss.ownerId) {

        const claim =
            data.channels[channelId]
                ?.userClaims?.[
                    boss.ownerId
                ];

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
            ?.userClaims?.[
                boss.ownerId
            ];
    }

    boss.owner = null;
    boss.ownerId = null;
    boss.tickets = 0;
    boss.expiresAt = null;

    await saveData(data);

    await updatePanel(interaction.channel);

    return interaction.reply({
        content:
            `✅ ${slotName.toUpperCase()} reset.`,
        flags: 64
    });
}

    let adc;

 console.log(
    Object.keys(data.channels[channelId].adc2)
);

if (target.startsWith('adc2')) {

    const spot =
        target.replace('adc2', '');

    adc =
        data.channels[channelId].adc2[spot];

} else {

    const spot =
        target.replace('adc', '');

    adc =
        data.channels[channelId].adc[spot];
}

console.log('target =', target);
console.log('adc =', adc);

if (adc.ownerId) {

    const claim =
        data.channels[channelId]
        ?.userClaims?.[adc.ownerId];

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

await saveData(data);

await updatePanel(interaction.channel);

return interaction.reply({
    content: `✅ ${target.toUpperCase()} reset.`,
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

const member =
    discordUser
        ? await interaction.guild.members.fetch(
            discordUser.id
        ).catch(() => null)
        : null;

const name =
    member?.displayName ||
    discordUser?.username ||
    manualName;

    if (!name) {

        return interaction.reply({
            content:
                '❌ Select a user or enter a name.',
            flags: 64
        });
    }

    let adc;
let chamberType;

if (spot.startsWith('adc2_')) {

    const actualSpot =
        spot.replace('adc2_', '');

    adc =
        data.channels[channelId]
            .adc2[actualSpot];

    chamberType = 'adc2';

} else {

    const actualSpot =
        spot.replace('adc_', '');

    adc =
        data.channels[channelId]
            .adc[actualSpot];

    chamberType = 'adc';
}

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

    data.channels[channelId].userClaims ??= {};

    const claimType =
        chamberType === 'adc2'
            ? `ADC I-II ${spot.replace('adc2_', '').toUpperCase()}`
            : `ADC I-I ${spot.replace('adc_', '').toUpperCase()}`;

    data.channels[channelId]
        .userClaims[discordUser.id] = {

        type: claimType,

        spot:
            chamberType === 'adc2'
                ? spot.replace('adc2_', '')
                : spot.replace('adc_', ''),

        tickets,
        expiresAt: adc.expiresAt,
        chamberType,
        claimPanelMessageId: null
    };

    const claimPanel =
        await interaction.channel.send({

            content:
`${discordUser} currently owns ${claimType}.`,

            components: [
                new ActionRowBuilder().addComponents(

                    new ButtonBuilder()
                        .setCustomId(`claim_end_${discordUser.id}`)
                        .setLabel('❌ End Claim')
                        .setStyle(ButtonStyle.Danger),

                    new ButtonBuilder()
                        .setCustomId(`claim_swap_${discordUser.id}`)
                        .setLabel('🔄 Swap Claim')
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        });

    data.channels[channelId]
        .userClaims[discordUser.id]
        .claimPanelMessageId =
            claimPanel.id;
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

if (type.startsWith('boss_')) {

    const slotName =
        type.replace('boss_', '');

    const boss =
        data.channels[channelId]
            .bossRotation?.[slotName];

    if (!boss) {

        return interaction.reply({
            content: '❌ Invalid boss slot.',
            flags: 64
        });
    }

    const ownerId =
        boss.ownerId;

    const claim =
        data.channels[channelId]
            ?.userClaims?.[ownerId];

    if (claim?.claimPanelMessageId) {

        try {

            const msg =
                await interaction.channel.messages.fetch(
                    claim.claimPanelMessageId
                );

            await msg.delete();

        } catch {}
    }

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
            `✅ ${slotName.toUpperCase()} cleared.`,
        flags: 64
    });
}

    let adc;

if (type.startsWith('adc2_')) {

    adc =
        data.channels[channelId]
            .adc2[
                type.replace('adc2_', '')
            ];

} else {

    adc =
        data.channels[channelId]
            .adc[
                type.replace('adc_', '')
            ];
}

const ownerId =
    adc.ownerId;

const claim =
    data.channels[channelId]
        ?.userClaims?.[ownerId];

if (claim?.claimPanelMessageId) {

    try {

        const msg =
            await interaction.channel.messages.fetch(
                claim.claimPanelMessageId
            );

        await msg.delete();

    } catch {}
}

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

    await saveData(data);

    await updatePanel(interaction.channel);

    return interaction.reply({
    content:
        `✅ ${type.toUpperCase()} cleared.`,
    flags: 64
});

}

if (interaction.commandName === 'forceswap') {

    await interaction.deferReply({ flags: 64 });;

    const from =
        interaction.options.getString('from');

    const to =
        interaction.options.getString('to');

    if (from === to) {

        return interaction.editReply({
            content:
                '❌ Cannot swap the same spot.',
        });
    }

    let fromSpot;
let toSpot;

if (from.startsWith('adc2_')) {

    fromSpot =
        data.channels[channelId]
            .adc2[
                from.replace('adc2_', '')
            ];

} else {

    fromSpot =
        data.channels[channelId]
            .adc[
                from.replace('adc_', '')
            ];
}

if (to.startsWith('adc2_')) {

    toSpot =
        data.channels[channelId]
            .adc2[
                to.replace('adc2_', '')
            ];

} else {

    toSpot =
        data.channels[channelId]
            .adc[
                to.replace('adc_', '')
            ];
}

    if (!fromSpot.ownerId) {

        return interaction.editReply({
            content:
                `❌ ADC ${from.toUpperCase()} is empty.`,
        });
    }

    const temp = {

        owner:
            fromSpot.owner,

        ownerId:
            fromSpot.ownerId,

        tickets:
            fromSpot.tickets,

        expiresAt:
            fromSpot.expiresAt
    };

    fromSpot.owner =
        toSpot.owner;

    fromSpot.ownerId =
        toSpot.ownerId;

    fromSpot.tickets =
        toSpot.tickets;

    fromSpot.expiresAt =
        toSpot.expiresAt;

    toSpot.owner =
        temp.owner;

    toSpot.ownerId =
        temp.ownerId;

    toSpot.tickets =
        temp.tickets;

    toSpot.expiresAt =
        temp.expiresAt;

 if (
    temp.ownerId &&
    data.channels[channelId]
        .userClaims[temp.ownerId]
) {

    const claim =
        data.channels[channelId]
            .userClaims[temp.ownerId];

    const newSpot =
        to.startsWith('adc2_')
            ? to.replace('adc2_', '')
            : to.replace('adc_', '');

    claim.spot =
        newSpot;

    claim.chamberType =
        to.startsWith('adc2_')
            ? 'adc2'
            : 'adc';

    claim.type =
        to.startsWith('adc2_')
            ? `ADC I-II ${newSpot.toUpperCase()}`
            : `ADC ${newSpot.toUpperCase()}`;
}

if (
    fromSpot.ownerId &&
    data.channels[channelId]
        .userClaims[fromSpot.ownerId]
) {

    const claim =
        data.channels[channelId]
            .userClaims[fromSpot.ownerId];

    const newSpot =
        from.startsWith('adc2_')
            ? from.replace('adc2_', '')
            : from.replace('adc_', '');

    claim.spot =
        newSpot;

    claim.chamberType =
        from.startsWith('adc2_')
            ? 'adc2'
            : 'adc';

    claim.type =
        from.startsWith('adc2_')
            ? `ADC I-II ${newSpot.toUpperCase()}`
            : `ADC ${newSpot.toUpperCase()}`;
}

    await saveData(data);

for (const userId of [
    temp.ownerId,
    fromSpot.ownerId
]) {

    const claim =
        data.channels[channelId]
            ?.userClaims?.[userId];

    if (
        !claim?.claimPanelMessageId
    ) continue;

    try {

        const panel =
            await interaction.channel.messages.fetch(
                claim.claimPanelMessageId
            );

        const user =
            await client.users.fetch(
                userId
            );

        await panel.edit({
            content:
`${user} currently owns ${claim.type}.`
        });

    } catch (err) {

        console.log(
            `[FORCESWAP] Failed to update claim panel for ${userId}`
        );
    }
}

    await updatePanel(
        interaction.channel
    );

    return interaction.editReply({
    content:
`✅ ${from.toUpperCase()} ↔ ${to.toUpperCase()} swapped.`
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
    target.startsWith('adc_') ||
    target.startsWith('adc2_')
) {

    let spot;

    if (target.startsWith('adc2_')) {

        spot =
            data.channels[channelId]
                .adc2[
                    target.replace('adc2_', '')
                ];

    } else {

        spot =
            data.channels[channelId]
                .adc[
                    target.replace('adc_', '')
                ];
    }

    if (!spot.ownerId) {

        return interaction.reply({
            content:
                `❌ ${target.toUpperCase()} is empty.`,
            flags: 64
        });
    }

    spot.expiresAt = expiresAt;

    if (
    spot.ownerId &&
    data.channels[channelId]
        .userClaims?.[spot.ownerId]
) {

    data.channels[channelId]
        .userClaims[spot.ownerId]
        .expiresAt = expiresAt;
}

}

if (target.startsWith('boss_')) {

    const slotName =
        target.replace('boss_', '');

    const boss =
        data.channels[channelId]
            .bossRotation?.[slotName];

    if (!boss) {

        return interaction.reply({
            content: '❌ Invalid boss slot.',
            flags: 64
        });
    }

    if (!boss.ownerId) {

        return interaction.reply({
            content:
                `❌ ${slotName.toUpperCase()} is empty.`,
            flags: 64
        });
    }

    boss.expiresAt =
        expiresAt;

    if (
        boss.ownerId &&
        data.channels[channelId]
            .userClaims?.[
                boss.ownerId
            ]
    ) {

        data.channels[channelId]
            .userClaims[
                boss.ownerId
            ]
            .expiresAt = expiresAt;
    }
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

        case 'sealingchamber':
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

if (boss === 'sealingchamber')
    bosses.sealingChamber.expiresAt = expiresAt;

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

if (interaction.commandName === 'setmode') {

    const mode =
        interaction.options.getString('mode');

    data.channels[channelId].channelConfig ??= {
        adcMode: 'single'
    };

    data.channels[channelId]
        .channelConfig.adcMode = mode;

    await saveData(data);

    return interaction.reply({
        content:
            `✅ Channel mode set to ${mode.toUpperCase()}.`,
        flags: 64
    });
}

if (interaction.commandName === 'addms11') {

    const data = loadData();

    const channelId =
        interaction.channel.id;

    const discordUser =
        interaction.options.getUser('user');

    const manualName =
        interaction.options.getString('name');

    const chamber =
        interaction.options.getString('chamber');

    const tickets =
        interaction.options.getInteger('tickets');

const member = discordUser
    ? await interaction.guild.members.fetch(
        discordUser.id
    )
    : null;

const name =
    member?.displayName ??
    manualName;

    if (!name) {

        return interaction.reply({
            content:
                '❌ Select a user or enter a name.',
            flags: 64
        });
    }

    data.channels[channelId]
        .specialClaims ??= {};

    const ownerId =
        discordUser
            ? discordUser.id
            : `manual_${Date.now()}`;

    if (
        data.channels[channelId]
            .specialClaims[ownerId]
    ) {

        return interaction.reply({
            content:
                '❌ User already owns a MS11 chamber.',
            flags: 64
        });
    }

    const expiresAt =
        Date.now() +
        (tickets * 30 * 60 * 1000);

    const chamberData =
        data.channels[channelId]
            .specialChambers[chamber];

    chamberData.claims.push({

        owner: name,
        ownerId,
        tickets,
        expiresAt,
        claimPanelMessageId: null
    });

    data.channels[channelId]
        .specialClaims[ownerId] = {

        chamber,
        tickets,
        expiresAt,
        claimPanelMessageId: null
    };

    if (discordUser) {

        const panel =
            await interaction.channel.send({

                content:
`${discordUser}

🏠 Chamber: ${chamber.toUpperCase()}
🎟 Tickets: ${tickets}`,

                components: [
                    new ActionRowBuilder()
                        .addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    `claim_swap_${discordUser.id}`
                                )
                                .setLabel(
                                    '🔄 Swap Chamber'
                                )
                                .setStyle(
                                    ButtonStyle.Primary
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    `claim_end_${discordUser.id}`
                                )
                                .setLabel(
                                    '❌ End Claim'
                                )
                                .setStyle(
                                    ButtonStyle.Danger
                                )
                        )
                ]
            });

        const claim =
            chamberData.claims.find(
                x => x.ownerId === discordUser.id
            );

        if (claim) {

            claim.claimPanelMessageId =
                panel.id;
        }

        data.channels[channelId]
            .specialClaims[
                discordUser.id
            ]
            .claimPanelMessageId =
                panel.id;
    }

    await saveData(data);

    await updateMS11Panel(
        interaction.channel
    );

    return interaction.reply({
        content:
            `✅ Added ${name} to ${chamber.toUpperCase()}.`,
        flags: 64
    });
}

if (interaction.commandName === 'removems11') {

    const data = loadData();

    const channelId = interaction.channel.id;

    const channelData = data.channels?.[channelId];

    if (!channelData) {
        return interaction.reply({
            content: '❌ This channel has no MS11 data.',
            flags: 64
        });
    }

    const user = interaction.options.getUser('user');
    const manualName = interaction.options.getString('name');

    if (!user && !manualName) {
        return interaction.reply({
            content: '❌ Provide a user or name.',
            flags: 64
        });
    }

    let userId;
    let claim;

    // DISCORD USER PATH

    if (user) {

        userId = user.id;

        claim = channelData.specialClaims?.[userId];
    }

    // MANUAL NAME PATH

    else {

        const specialClaims = channelData.specialClaims;

        const entry = Object.entries(specialClaims).find(([id, c]) => {

            const chamber =
                channelData.specialChambers?.[c.chamber];

            if (!chamber) return false;

            return chamber.claims.some(x =>
                x.owner.toLowerCase() === manualName.toLowerCase()
            );
        });

        if (!entry) {
            return interaction.reply({
                content: '❌ No matching manual name found.',
                flags: 64
            });
        }

        userId = entry[0];
        claim = entry[1];
    }

    if (!claim) {
        return interaction.reply({
            content: '❌ User has no MS11 claim.',
            flags: 64
        });
    }

    const chamber =
        channelData.specialChambers?.[claim.chamber];

    if (!chamber) {
        return interaction.reply({
            content: '❌ Chamber not found.',
            flags: 64
        });
    }

    if (claim.claimPanelMessageId) {

        try {
            const msg =
                await interaction.channel.messages.fetch(
                    claim.claimPanelMessageId
                );

            await msg.delete();
        } catch {}
    }

    chamber.claims =
        chamber.claims.filter(
            x => x.ownerId !== userId && x.owner !== manualName
        );

    delete channelData.specialClaims[userId];

    await saveData(data);

    await updateMS11Panel(interaction.channel);

    return interaction.reply({
        content: `✅ Removed ${user ? user.username : manualName} from ${claim.chamber.toUpperCase()}.`,
        flags: 64
    });
}

});

// SLASH COMMANDS

const commands = [
new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Create chamber panel')
    .setDefaultMemberPermissions(
        PermissionFlagsBits.ManageGuild
    ),

new SlashCommandBuilder()
    .setName('removepanel')
    .setDescription('Remove chamber panel')
    .setDefaultMemberPermissions(
        PermissionFlagsBits.ManageGuild
    ),

new SlashCommandBuilder()
.setName('setupms11')
.setDescription('Create MS11 chamber panel')
.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild
),

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
    { name: 'ADC I-I LEFT', value: 'adc_left' },
    { name: 'ADC I-I CENTER', value: 'adc_center' },
    { name: 'ADC I-I RIGHT', value: 'adc_right' },

    { name: 'ADC I-II LEFT', value: 'adc2_left' },
    { name: 'ADC I-II CENTER', value: 'adc2_center' },
    { name: 'ADC I-II RIGHT', value: 'adc2_right' },

    { name: 'Boss Rotation SLOT1', value: 'boss_slot1' },
    { name: 'Boss Rotation SLOT2', value: 'boss_slot2' },
    { name: 'Boss Rotation SLOT3', value: 'boss_slot3' }
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
    { name: 'ADC I-I LEFT', value: 'adc_left' },
    { name: 'ADC I-I CENTER', value: 'adc_center' },
    { name: 'ADC I-I RIGHT', value: 'adc_right' },

    { name: 'ADC I-II LEFT', value: 'adc2_left' },
    { name: 'ADC I-II CENTER', value: 'adc2_center' },
    { name: 'ADC I-II RIGHT', value: 'adc2_right' }
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
    { name: 'ADC I-I LEFT', value: 'adc_left' },
    { name: 'ADC I-I CENTER', value: 'adc_center' },
    { name: 'ADC I-I RIGHT', value: 'adc_right' },

    { name: 'ADC I-II LEFT', value: 'adc2_left' },
    { name: 'ADC I-II CENTER', value: 'adc2_center' },
    { name: 'ADC I-II RIGHT', value: 'adc2_right' },

    { name: 'Boss Rotation SLOT1', value: 'boss_slot1' },
    { name: 'Boss Rotation SLOT2', value: 'boss_slot2' },
    { name: 'Boss Rotation SLOT3', value: 'boss_slot3' }
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
            { name: 'ADC I-I LEFT', value: 'adc_left' },
            { name: 'ADC I-I CENTER', value: 'adc_center' },
            { name: 'ADC I-I RIGHT', value: 'adc_right' },

            { name: 'ADC I-II LEFT', value: 'adc2_left' },
            { name: 'ADC I-II CENTER', value: 'adc2_center' },
            { name: 'ADC I-II RIGHT', value: 'adc2_right' }
        )
)

.addStringOption(option =>
    option
        .setName('to')
        .setDescription('Destination spot')
        .setRequired(true)
        .addChoices(
            { name: 'ADC I-I LEFT', value: 'adc_left' },
            { name: 'ADC I-I CENTER', value: 'adc_center' },
            { name: 'ADC I-I RIGHT', value: 'adc_right' },

            { name: 'ADC I-II LEFT', value: 'adc2_left' },
            { name: 'ADC I-II CENTER', value: 'adc2_center' },
            { name: 'ADC I-II RIGHT', value: 'adc2_right' }
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
    { name: 'ADC I-I LEFT', value: 'adc_left' },
    { name: 'ADC I-I CENTER', value: 'adc_center' },
    { name: 'ADC I-I RIGHT', value: 'adc_right' },

    { name: 'ADC I-II LEFT', value: 'adc2_left' },
    { name: 'ADC I-II CENTER', value: 'adc2_center' },
    { name: 'ADC I-II RIGHT', value: 'adc2_right' },

    { name: 'Boss Rotation SLOT1', value: 'boss_slot1' },
    { name: 'Boss Rotation SLOT2', value: 'boss_slot2' },
    { name: 'Boss Rotation SLOT3', value: 'boss_slot3' }
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
    { name: 'Gold Herb', value: 'goldherb' },
    { name: 'Sealing Chamber', value: 'sealingchamber' }
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

new SlashCommandBuilder()
.setName('setmode')
.setDescription('Set ADC mode for this channel')

.addStringOption(option =>
    option
        .setName('mode')
        .setDescription('ADC mode')
        .setRequired(true)
        .addChoices(
            { name: 'Single ADC', value: 'single' },
            { name: 'Dual ADC', value: 'dual' }
        )
)

.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild
),

new SlashCommandBuilder()
.setName('addms11')
.setDescription('Add user to MS11 chamber')

.addStringOption(option =>
    option
        .setName('chamber')
        .setDescription('Chamber')
        .setRequired(true)
        .addChoices(
            { name: 'Frenzy', value: 'frenzy' },
            { name: 'Fury', value: 'fury' },
            { name: 'Lucky', value: 'lucky' },
            { name: 'Others', value: 'others' }
        )
)

.addIntegerOption(option =>
    option
        .setName('tickets')
        .setDescription('Tickets')
        .setRequired(true)
)

.addUserOption(option =>
    option
        .setName('user')
        .setDescription('Discord User')
        .setRequired(false)
)

.addStringOption(option =>
    option
        .setName('name')
        .setDescription('Manual Name')
        .setRequired(false)
)

.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageGuild
),

new SlashCommandBuilder()
.setName('removems11')
.setDescription('Remove user from MS11')
.addUserOption(option =>
    option
        .setName('user')
        .setDescription('Discord User')
        .setRequired(false)
)

.addStringOption(option =>
    option
        .setName('name')
        .setDescription('Manual Name')
        .setRequired(false)
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

console.log('[INTERVAL CREATED]');

setInterval(async () => {

    const data = loadData();

    for (const channelId of Object.keys(data.channels || {})) {

        try {

            if (!data.channels[channelId]) {
                continue;
            }

            const channel =
                await client.channels.fetch(channelId);

            const chambers =
    data.channels[channelId]
        ?.specialChambers;

if (chambers) {

    for (const chamberName of Object.keys(chambers)) {

        const chamber =
            chambers[chamberName];

        if (!chamber.claims) continue;

        for (const claim of [...chamber.claims]) {

            if (
                claim.expiresAt &&
                Date.now() >= claim.expiresAt
            ) {

                if (claim.claimPanelMessageId) {

                    try {

                        const msg =
                            await channel.messages.fetch(
                                claim.claimPanelMessageId
                            );

                        await msg.delete();

                    } catch {}
                }

                chamber.claims =
                    chamber.claims.filter(
                        c => c.ownerId !== claim.ownerId
                    );

                 

                delete data.channels[channelId]
                    .specialClaims?.[
                        claim.ownerId
                    ];

                console.log(
                    `[MS11 EXPIRED] ${chamberName} ${claim.owner}`
                );
            }
        }
    }
}

            if (!channel) continue;

            if (!data.channels[channelId].bossRotation) {

    data.channels[channelId].bossRotation = {

        slot1: {
            owner: null,
            ownerId: null,
            tickets: 0,
            expiresAt: null
        },

        slot2: {
            owner: null,
            ownerId: null,
            tickets: 0,
            expiresAt: null
        },

        slot3: {
            owner: null,
            ownerId: null,
            tickets: 0,
            expiresAt: null
        }

    };

}

            const bossSlots = [
    'slot1',
    'slot2',
    'slot3'
];

for (const slotName of bossSlots) {

    const boss =
        data.channels[channelId]
            .bossRotation?.[slotName];

    if (
        boss?.ownerId &&
        boss?.expiresAt &&
        Date.now() >= boss.expiresAt
    ) {

        console.log(
            `[EXPIRED] Boss Rotation ${slotName}`
        );

        const claim =
            data.channels[channelId]
                ?.userClaims?.[
                    boss.ownerId
                ];

        if (claim?.claimPanelMessageId) {

            try {

                const msg =
                    await channel.messages.fetch(
                        claim.claimPanelMessageId
                    );

                await msg.delete();

            } catch {}
        }

        delete data.channels[channelId]
            ?.userClaims?.[
                boss.ownerId
            ];

        boss.owner = null;
        boss.ownerId = null;
        boss.tickets = 0;
        boss.expiresAt = null;
    }
}

    const adcSpots = ['left', 'center', 'right'];

    if (!data.channels[channelId]?.adc)
    continue;

    if (!data.channels[channelId]?.adc2)
    continue;

    for (const spot of adcSpots) {

    const adc =
        data.channels[channelId]?.adc?.[spot];

    if (!adc) continue;

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
     ?.userClaims?.[adc.ownerId];

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

if (data.channels[channelId]?.userClaims) {

    delete data.channels[channelId]
        .userClaims[expiredOwnerId];

}

      adc.owner = null;
      adc.ownerId = null;
      adc.tickets = 0;
      adc.expiresAt = null;

await sendAutoDelete(
    channel,
    `🟢 ADC I-I ${spot.toUpperCase()} is now available.`
);
        }
    }

for (const spot of adcSpots) {

    const adc =
        data.channels[channelId]?.adc2?.[spot];

    if (!adc) continue;

    if (
        adc.ownerId &&
        adc.expiresAt &&
        Date.now() >= adc.expiresAt
    ) {

        console.log(
            `[EXPIRED] ADC I-II ${spot.toUpperCase()} released`
        );

        const claim =
            data.channels[channelId]
            ?.userClaims?.[adc.ownerId];

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

        const expiredOwnerId =
            adc.ownerId;

        if (data.channels[channelId]?.userClaims) {

            delete data.channels[channelId]
                .userClaims[expiredOwnerId];
        }

        adc.owner = null;
        adc.ownerId = null;
        adc.tickets = 0;
        adc.expiresAt = null;

        await sendAutoDelete(
            channel,
            `🟢 ADC I-II ${spot.toUpperCase()} is now available.`
        );
    }
}

await saveData(data);

if (data.channels[channelId].panelMessageId) {

    await updatePanel(channel, data);

}

if (data.channels[channelId].ms11PanelMessageId) {

    await updateMS11Panel(channel, data);

}

        } catch (err) {
            console.error(
                `[AUTO REFRESH FAILED] ${channelId}`,
                err
            );
        }
    }

}, 15000);

client.login(process.env.TOKEN);