require('dotenv').config();

// imports
const { Client, RichEmbed } = require('discord.js');
const { VoiceChannelsDetailsStorage } = require('./voiceEventsStorage')
const { getCommunityDetails } = require('./api')
const axios = require('axios');
const getEmojis = require('discordjs-getemojis');

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

  console.log('voiceStateUpdate');
  console.log('oldState', oldState.voiceChannel);
  console.log('newState', newState.voiceChannel);
  let currentData = voiceChannelEventsStorage.getUserVoiceChannelData(newState.guild.id, newState.user.id);
  if (!currentData)
    currentData = {
      tokenId: 1,
      joinedTimestamp: Date.now(),
      totalTimeInTheCall: 0,

      isMute: newState.selfMute,
      totalUnmuttedTime: 0,
      lastTimeUnmuted: newState.selfMute ? undefined : Date.now(),

      isStreaming: newState.selfStream,
      lastTimeStreaming: newState.selfStream ? Date.now() : undefined,
      totalStreamingTime: 0
    }
  let guildUserData;
  if (newState.voiceChannel) {
    guildUserData = {
      tokenId: 1,
      joinedTimestamp: currentData.joinedTimestamp,
      totalTimeInTheCall: currentData.totalTimeInTheCall,

      isMute: newState.selfMute,

      totalUnmuttedTime: !currentData.isMute && newState.selfMute ?
        currentData.totalUnmuttedTime + (currentData.lastTimeUnmuted ? new Date() - new Date(currentData.lastTimeUnmuted) : 0) :
        currentData.totalUnmuttedTime,

      lastTimeUnmuted:
        currentData.isMute && !newState.selfMute ?
          Date.now() :
          currentData.lastTimeUnmuted,

      isStreaming: newState.selfStream,

      totalStreamingTime: currentData.isStreaming && !newState.isStreaming ?
        currentData.totalStreamingTime + (currentData.lastTimeStreaming ? new Date() - new Date(currentData.lastTimeStreaming) : 0) :
        currentData.totalStreamingTime,

      lastTimeStreaming:
        !currentData.isStreaming && newState.selfStream ?
          Date.now() :
          currentData.lastTimeStreaming,
    }
  } else {
    console.log('leavinng the call');
    console.log('joined', new Date(currentData.joinedTimestamp));
    console.log(Date.now() - currentData.joinedTimestamp);
    guildUserData = {
      tokenId: 1,
      joinedTimestamp: currentData.joinedTimestamp,
      totalTimeInTheCall: currentData.totalTimeInTheCall + (Date.now() - currentData.joinedTimestamp),
      isMute: newState.selfMute,

      totalUnmuttedTime: !currentData.isMute ?
        currentData.totalUnmuttedTime + (currentData.lastTimeUnmuted ? new Date() - new Date(currentData.lastTimeUnmuted) : 0) :
        currentData.totalUnmuttedTime,

      lastTimeUnmuted:
        !currentData.isMute ?
          Date.now() :
          currentData.lastTimeUnmuted,

      isStreaming: newState.selfStream,

      totalStreamingTime: currentData.isStreaming ?
        currentData.totalStreamingTime + (currentData.lastTimeStreaming ? new Date() - new Date(currentData.lastTimeStreaming) : 0) :
        currentData.totalStreamingTime,

      lastTimeStreaming:
        !currentData.isStreaming ?
          Date.now() :
          currentData.lastTimeStreaming,
    }
  }
  voiceChannelEventsStorage.addOrEditUserData(newState.guild.id, newState.user.id, guildUserData);
});

// message
bot.on('message', async msg => {
  if (msg.content.startsWith('/import-roles')) {
    const key = msg.content.split(' ')[1];
    const { roles: { roles: commRoles } } = await getCommunityDetails(key);

    commRoles.forEach(async (role, i) => {
      if (!msg.guild.roles.find(r => r.name === role.roleName)) {
        msg.guild.createRole({
            name: role.roleName,
            color: ROLE_COLORS[i],
            mentionable: true,
            reason: "SkillWallet role"
        });

        msg.reply(`${role.roleName} Role added!`);
      } else console.warn(`EXISTING ROLE ------- ${role.roleName}`);
    });
  }
  if (msg.content.startsWith('/post-poll')) {

    // const channel = await msg.guild.channels.cache.get(channelSettings.channelID);
    const polls = getPolls();

    polls.forEach(async poll => {

      const description = msg.content.replace('/post-poll ', '');

      const emojis = getEmojis(msg);

      const pollContent = new RichEmbed().setTitle(poll.title).setDescription(`${description}\nThis poll expires on ${poll.endDate}`);

      msg.channel.send({ embed: pollContent }) // Use a 2d array?
        .then(async function (message) {
          var reactionArray = [];
          for (var i = 0; i < emojis.length; i++) {
            reactionArray[i] = await message.react(emojis[i] === 'object' ? emojis[i].id : emojis[i]);
          }

          setTimeout(() => {
            // Re-fetch the message and get reaction counts
            message.channel.fetchMessage(message.id)
              .then(async function (message) {
                var reactionCountsArray = [];
                for (var i = 0; i < reactionArray.length; i++) {
                  console.log('reactions', i, reactionArray[i].count - 1);
                  reactionCountsArray[i] = reactionArray[i].count - 1;
                }

                // Find winner(s)
                var max = -Infinity, indexMax = [];
                for (var i = 0; i < reactionCountsArray.length; ++i)
                  if (reactionCountsArray[i] > max) max = reactionCountsArray[i], indexMax = [i];
                  else if (reactionCountsArray[i] === max) indexMax.push(i);

                console.log('indexMax', indexMax)
                // Display winner(s)
                var winnersText = "";
                if (reactionCountsArray[indexMax[0]] == 0) {
                  winnersText = "No one voted!"
                } else {
                  for (var i = 0; i < indexMax.length; i++) {
                    console.log('winner emoji', i, emojis[i]);
                    winnersText +=
                      emojis[indexMax[i]] + " (" + reactionCountsArray[indexMax[i]] + " vote(s))\n";
                  }
                }
                pollContent.addField("**Winner(s):**", winnersText);
                pollContent.setFooter(`The vote is now closed!`);
                pollContent.setTimestamp();
                msg.channel.send({ embed: pollContent })
              });
          }, new Date(poll.endDate) - Date.now() > 0 ? new Date(poll.endDate) - Date.now() : 10000);
        }).catch(console.error);
    })
  }
  if (msg.content === '/connect-sw') {
    msg.reply(`Please follow this link https://discord.com/api/oauth2/authorize?client_id=898586559228551208&redirect_uri=http%3A%2F%2Flocalhost%3A3334&response_type=code&scope=identify`);
  }
  if (msg.content === '/get-voice-chat-data') {
    const guildData = voiceChannelEventsStorage.getVoiceChannelData(msg.guild.id);
    msg.reply(JSON.stringify(guildData));
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
      endDate: '2021-11-25 14:22:00',
    },
    // {
    //   tokenId: 2,
    //   title: 'Is Milena awesome?',
    //   description: 'Milena is super awesome, what do you think?',
    //   endDate: '21-Nov-2021',
    // },
    // {
    //   tokenId: 3,
    //   title: 'Is DiTo awesome?',
    //   description: 'DiTo is super awesome, what do you think?',
    //   endDate: '22-Nov-2021',
    // }
  ]
}


function getCommunityCalls() {
  return [
    {
      tokenId: 1,
      startDate: '2021-11-25 14:22:00',
      endDate: '2021-11-25 14:22:00',
      roles: ['Member']
    }
  ]
}
