require('dotenv').config();

// imports
const { Client, MessageEmbed } = require('discord.js');
const { VoiceChannelsDetailsStorage } = require('./voiceEventsStorage')
const { getCommunityDetails } = require('./api')

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

// voice state update
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

// message
bot.on('message', async msg => {

  if (msg.content.startsWith('/setup')) {
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
    // store guild <-> channel in a database.
    const channelID = await msg.guild.channels.create('skill-wallet');
    console.log(channelID.id);
  }

  if (msg.content === '/post-poll') {

    // console.log(a);
    const polls = getPolls();
    const channelSettings = getChannel(undefined);

    const channel = await msg.guild.channels.cache.get(channelSettings.channelID);

    polls.forEach(async poll => {
      const pollContent = new MessageEmbed().setTitle(poll.title).setDescription(`${poll.description}\nThis poll expires on ${poll.endDate}`).setColor('PINK');
      const message = await channel.send({ embed: pollContent });
      console.log(message.id);
      // store messageID <-> pollID in a database!
    });
  }
  if (msg.content === '/connect-sw') {
    msg.reply(`Please follow this link https://discord.com/api/oauth2/authorize?client_id=898586559228551208&redirect_uri=http%3A%2F%2Flocalhost%3A3334&response_type=code&scope=identify`);
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

function getPolls() {
  return [
    {
      tokenId: 1,
      title: 'Is SkillWallet awesome?',
      description: 'SkillWallet is super awesome, what do you think?',
      endDate: '2021-11-19 18:03:00'
    },
    {
      tokenId: 2,
      title: 'Is Milena awesome?',
      description: 'Milena is super awesome, what do you think?',
      endDate: '21-Nov-2021',
    },
    {
      tokenId: 3,
      title: 'Is DiTo awesome?',
      description: 'DiTo is super awesome, what do you think?',
      endDate: '22-Nov-2021',
    }
  ]
}

function getChannel(guild) {
  return {
    channelID: '911282585584422933'
  }
}