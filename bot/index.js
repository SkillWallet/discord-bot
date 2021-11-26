require('dotenv').config();

// imports
const { Client, RichEmbed } = require('discord.js');
const { VoiceChannelsDetailsStorage } = require('./voiceEventsStorage')
const { getCommunityDetails } = require('./api')
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

function getChannel(guild) {
  return {
    channelID: '911282585584422933'
  }
}