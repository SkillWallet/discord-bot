require('dotenv').config();
const { Client, RoleManager } = require('discord.js');
var QRCode = require('qrcode')
const bot = new Client();
const TOKEN = process.env.TOKEN;
const axios = require('axios');
const { VoiceChannelsDetailsStorage } = require('./voiceEventsStorage')
bot.login(TOKEN);
const roleColors = ['BLUE', 'GREEN', 'PURPLE'];
const voiceChannelEventsStorage = new VoiceChannelsDetailsStorage();

const getDiscordConnectNonce = async () => {
  // TODO: change action!
  const resp = await axios.post(`https://api.skillwallet.id/api/skillwallet/-1/nonces?action=1`);
  return resp.data;
}
const getCommunityDetails = async (key) => {
  const resp = await axios.get(`https://api.distributed.town/api/community/key/${key}`);
  return resp.data;
}

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
            color: roleColors[i],
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
