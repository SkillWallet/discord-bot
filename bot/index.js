require('dotenv').config();

// imports
var QRCode = require('qrcode')
const { Client } = require('discord.js');
const { VoiceChannelsDetailsStorage } = require('./voiceEventsStorage')
const { getCommunityDetails, getDiscordConnectNonce } = require('./api')

// constants
const ROLE_COLORS = ['BLUE', 'GREEN', 'PURPLE'];
const TOKEN = process.env.TOKEN;


// init
const bot = new Client();
const voiceChannelEventsStorage = new VoiceChannelsDetailsStorage();

bot.login(TOKEN);

// events actions
bot.on('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});


bot.on('voiceStateUpdate', async (oldState, newState) => {
  const current = voiceChannelEventsStorage.get(newState.member.user.id);
  if (!current) {
    voiceChannelEventsStorage.add(newState.member.user.id, {
      joinedTimestamp: newState.member.joinedTimestamp,
      isMute: newState.mute,
      isDeaf: newState.deaf,
      isStreaming: newState.streaming,
    });
    console.log('stored new voice user');
  } else {
    voiceChannelEventsStorage.edit(newState.member.user.id, {
      joinedTimestamp: current.joinedTimestamp,
      isMute: newState.mute,
      isDeaf: newState.deaf,
      isStreaming: newState.streaming,
    });
  }
});


bot.on('message', async msg => {
  if (msg.content.startsWith('/add-roles')) {
    console.log();

    const key = msg.content.split(' ')[1];
    const comDetails = await getCommunityDetails(key);
    comDetails.roles.forEach((role, i) => {
      if (!msg.guild.roles.cache.find(role => role.name === role))
        msg.guild.roles.create({
          data: {
            name: role,
            color: ROLE_COLORS[i],
            mentionable: true
          },
          reason: "SkillWallet role"
        });
    });

    msg.reply(`${comDetails.roles} Roles added!`);
  }
  if (msg.content === '/connect-sw') {
    getDiscordConnectNonce().then(res =>
      QRCode.toFile("./qr.png", `{"discordID": "${msg.author.id}", "nonce": ${res.nonce}}`, function (err, url) {
        msg.author.send(
          "Scan this QR code with your mobile app to connect your SkillWallet ID to your discord!",
          { files: ["./qr.png"] });
      })
    );
  }
  if (msg.content === '/voice-chat-info') {
    const userIds = voiceChannelEventsStorage.getUserIDs();
    userIds.forEach(id => {
      msg.reply(JSON.stringify(voiceChannelEventsStorage.get(id)));
    });
  }
  if (msg.content === '/voice-chat-clear') {
    voiceChannelEventsStorage.clear();
  }
});
