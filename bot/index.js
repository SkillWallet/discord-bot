require("dotenv").config();

// imports
const { Client, MessageEmbed, Intents } = require("discord.js");
const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const redis = require("redis");
const { getCommunityDetails } = require("./api");
const { config } = require("./config");
const express = require("express");

const app = express();

app.post("/poll", (req, res) => postPoll(req, res));

app.listen(6005, () => {
  console.log(`Example app listening on port 6005`);
});

// constants
const {
  messages: { prefixes },
  roles: { colors },
} = config;
const TOKEN = process.env.TOKEN;

// init
const bot = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

const redisClient = redis.createClient({
  url: "redis://:@redis:6379",
});

bot.login(TOKEN);
// redisClient.connect();

// events actions
bot.on("ready", () => {
  console.info(`Logged in as ${bot.user.tag}!`);

  joinChannel();
});

// voice state update
// bot.on("voiceStateUpdate", async (oldState, newState) => {
//   console.log("voiceStateUpdate");
//   let currentData = await redisClient.hGet(newState.id);
//   if (!currentData) {
//     currentData = {
//       tokenId: 1,
//       joinedTimestamp: Date.now(),
//       totalTimeInTheCall: 0,

//       isMute: newState.selfMute,
//       totalUnmutedTime: 0,
//       lastTimeUnmuted: newState.selfMute ? "selfMute" : Date.now(),
//       // need to set something other than undefined when user is muted
//       isStreaming: newState.streaming,
//       lastTimeStreaming: newState.streaming ? Date.now() : "noStream",
//       totalStreamingTime: 0,
//     };
//   }
//   let guildUserData;
//   if (newState.voiceChannel) {
//     guildUserData = {
//       tokenId: 1,
//       joinedTimestamp: currentData.joinedTimestamp,
//       totalTimeInTheCall: currentData.totalTimeInTheCall,

//       isMute: newState.selfMute,

//       totalUnmutedTime:
//         !currentData.isMute && newState.selfMute
//           ? currentData.totalUnmutedTime +
//             (currentData.lastTimeUnmuted
//               ? new Date() - new Date(currentData.lastTimeUnmuted)
//               : 0)
//           : currentData.totalUnmutedTime,

//       lastTimeUnmuted:
//         currentData.isMute && !newState.selfMute
//           ? Date.now()
//           : currentData.lastTimeUnmuted,

//       isStreaming: newState.streaming,

//       totalStreamingTime:
//         currentData.isStreaming && !newState.isStreaming
//           ? currentData.totalStreamingTime +
//             (currentData.lastTimeStreaming
//               ? new Date() - new Date(currentData.lastTimeStreaming)
//               : 0)
//           : currentData.totalStreamingTime,

//       lastTimeStreaming:
//         !currentData.isStreaming && newState.streaming
//           ? Date.now()
//           : currentData.lastTimeStreaming,
//     };
//   } else {
//     console.log("leavinng the call");
//     console.log("joined", new Date(currentData.joinedTimestamp));
//     console.log(Date.now() - currentData.joinedTimestamp);
//     guildUserData = {
//       tokenId: 1,
//       joinedTimestamp: currentData.joinedTimestamp,
//       totalTimeInTheCall:
//         currentData.totalTimeInTheCall +
//         (Date.now() - currentData.joinedTimestamp),
//       isMute: newState.selfMute,

//       totalUnmutedTime: !currentData.isMute
//         ? currentData.totalUnmutedTime +
//           (currentData.lastTimeUnmuted
//             ? new Date() - new Date(currentData.lastTimeUnmuted)
//             : 0)
//         : currentData.totalUnmutedTime,

//       lastTimeUnmuted: !currentData.isMute
//         ? Date.now()
//         : currentData.lastTimeUnmuted,

//       isStreaming: newState.streaming,

//       totalStreamingTime: currentData.isStreaming
//         ? currentData.totalStreamingTime +
//           (currentData.lastTimeStreaming
//             ? new Date() - new Date(currentData.lastTimeStreaming)
//             : 0)
//         : currentData.totalStreamingTime,

//       lastTimeStreaming: !currentData.isStreaming
//         ? Date.now()
//         : currentData.lastTimeStreaming,
//     };
//   }

//   redisClient.hSet(newState.id, guildUserData);
// });

// message
bot.on("messageCreate", async (msg) => {
  if (msg.content.startsWith(prefixes.importRoles)) {
    let output = [];
    const key = msg.content.split(" ")[1];
    const {
      roles: { roles: communityRoles },
    } = await getCommunityDetails(key);

    communityRoles
      .filter((role) => !msg.guild.roles.find((r) => r.name === role.roleName))
      .forEach((role, i) => {
        msg.guild.createRole({
          name: role.roleName,
          color: colors[i],
          mentionable: true,
          reason: "SkillWallet role",
        });

        output.push(role.roleName);
      });

    output.length
      ? output.length > 1
        ? msg.reply(`${output} Roles added!`)
        : msg.reply(`${output} Role added!`)
      : msg.reply(`No new Roles were found.`);
  } else if (msg.content === prefixes.connectSW) {
    msg.reply(
      `Please follow this link https://discord.com/api/oauth2/authorize?client_id=898586559228551208&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fredirect&response_type=code&scope=identify`
    );
  } else if (msg.content === prefixes.getVoiceChatData) {
    const guildData = voiceChannelEventsStorage.getVoiceChannelData(
      msg.guild.id
    );
    msg.reply(JSON.stringify(guildData));
  } else if (msg.content === prefixes.clearVoiceChat) {
    voiceChannelEventsStorage.clear();
  }
});

async function postPoll(req, res) {
  res.sendStatus(200);
  const channel = await bot.channels.cache.find((c) => c.name == "general");
  // get poll data
  const poll = {
    title: "Do you want us to implement Polls?",
    description: "Everyone from a specific role would be able to vote to achieve truly decentralized communities!",
    options: ["Yes 👍", "No 👎"],
    emojis: ["👍", "👎"],
    duration: "1d5h",
    role: 1,
    roleName: "Tech",
    activityAddress: "0x...",
    activityId: 2,
  };

  const options = poll.options.join('\n');
  // create poll
  const pollContent = new MessageEmbed()
    .setTitle(poll.title)
    .setDescription(
      `${poll.description}\n\n${options}\n\nThis poll expires in ${poll.duration}\nRoles: ${poll.roleName}`
    );

  // bot post poll
  channel
    .send({ embeds: [pollContent] }) // Use a 2d array?
    .then(async function (message) {
      let reactionArray = [];
      for (let i = 0; i < poll.emojis.length; i++) {
        reactionArray[i] = await message.react(poll.emojis[i]);
      }
      setTimeout(
        () => {
          // Re-fetch the message and get reaction counts
          let reactionCountsArray = [];
          for (let i = 0; i < reactionArray.length; i++) {
            reactionCountsArray[i] = reactionArray[i].count - 1;
          }

          // Find winner(s)
          let max = -Infinity,
            indexMax = [];
          for (let i = 0; i < reactionCountsArray.length; ++i)
            if (reactionCountsArray[i] > max)
              (max = reactionCountsArray[i]), (indexMax = [i]);
            else if (reactionCountsArray[i] === max) indexMax.push(i);

          // Display winner(s)
          let winnersText = "";
          if (reactionCountsArray[indexMax[0]] == 0) {
            winnersText = "No one voted!";
          } else {
            for (let i = 0; i < indexMax.length; i++) {
              const customEmoji = message.guild.emojis.cache.find(
                (e) => e.id === poll.emojis[indexMax[i]]
              );
              const emoji = customEmoji
                ? `<:${customEmoji.name}:${customEmoji.id}>`
                : poll.emojis[indexMax[i]];

              winnersText +=
                emoji + " (" + reactionCountsArray[indexMax[i]] + " vote(s))\n";
            }
          }
          pollContent.addField("**Winner(s):**", winnersText);
          pollContent.setTimestamp();
          channel.send({ embeds: [pollContent] });
        },
        new Date(poll.endDate) - Date.now() > 0
          ? new Date(poll.endDate) - Date.now()
          : 10000
      );
    })
    .catch(console.error);
}

async function joinChannel() {
  const channel = bot.channels.cache.get("945762562904055878");
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
    return connection;
  } catch (error) {
    connection.destroy();
    throw error;
  }
}
