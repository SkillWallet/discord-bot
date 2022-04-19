require("dotenv").config();

// imports
const { Client, MessageEmbed, Intents } = require("discord.js");
const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const redis = require("redis");
const {
  getRole,
  getCommunityDetails,
  finalizeActivity,
  getSkillWalletsPerCommunity,
  getDiscordID,
  getCommunityFromActivities,
} = require("./api");
const { config } = require("./config");
const express = require("express");
var cors = require("cors");
const bodyParser = require("body-parser");
const {
  getGuildPerCommunity,
  getGuildPerKey,
  addGuild,
  insertPoll,
  getAllPolls,
  deletePoll,
} = require("./mongo.db");
const { connect } = require("mongoose");

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post("/poll", (req, res) => postPoll(req, res));

app.listen(6005, () => {
  connect("mongodb://localhost:27017/bot");
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
  closePolls();
  // joinChannel();
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
      address,
    } = await getCommunityDetails(key);
    communityRoles
      .filter(
        (role) => !msg.guild.roles.cache.find((r) => r.name === role.roleName)
      )
      .forEach((role, i) => {
        console.log(role);
        msg.guild.roles.create({
          name: role.roleName,
          color: colors[i],
          mentionable: true,
          reason: "SkillWallet role",
        });

        output.push(role.roleName);
      });

    addGuild(msg.guildId, key, address);

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
  } else if (msg.content === prefixes.swHelp) {
    const reply = new MessageEmbed()
      .setTitle('Help')
      .addField('/setup', `The first thing you need to do is enter \`/setup\`
        to import all your community roles, otherwise the bot will not work.`)
      .addField('/connect-sw', `Each SkillWallet holder in the community should connect their SkillWallet by
        entering \`/connect-sw\` so they can vote in polls and receive interactions.`)
      .addField('/setup {key}', `Not sure what this does.`)
  
    msg.channel.send({ embeds: [reply] });
  }
});

async function postPoll(req, res) {
  console.log(req.body);
  res.sendStatus(200);
  const community = req.body.communityAddress;
  const guildId = await getGuildPerCommunity(community);
  console.log("guild", guildId);
  console.log(bot.guilds.cache);

  const guild = await bot.guilds.cache.find((guild) => guild.id == guildId);
  const channel = guild.channels.cache.find((c) => c.name == "general");
  // get poll data
  const poll = req.body;

  // publish a poll
  const options = poll.options.join("\n");
  const pollContent = new MessageEmbed()
    .setTitle(poll.title)
    .setDescription(
      `${poll.description}\n\n${options}\n\nThis poll expires in ${poll.duration}\nRoles: ${poll.roleName}`
    );
  channel
    .send({ embeds: [pollContent] }) // Use a 2d array?
    .then(async function (message) {
      let reactionArray = [];
      for (let i = 0; i < poll.emojis.length; i++) {
        reactionArray[i] = await message.react(poll.emojis[i]);
      }

      const date = new Date();
      let daysToAdd = 0;

      switch (poll.duration) {
        case "1d":
          daysToAdd = 1;
          break;
        case "1w":
          daysToAdd = 7;
          break;
        case "1m":
          daysToAdd = 30;
          break;
      }
      var endDate = date.setDate(date.getDate() + daysToAdd);

      insertPoll(
        guildId,
        channel.id,
        message.id,
        endDate,
        poll.emojis,
        poll.activitiesAddress,
        poll.activityId,
        poll.role
      );
    })
    .catch(console.error);
}
async function closePolls() {
  console.log("closePolls");

  const polls = await getAllPolls();
  polls.forEach(async (poll) => {
    if (poll.endDate < Date.now()) {
      const guild = await bot.guilds.fetch(poll.guildID);
      console.log(poll.guildID);
      console.log(guild ? "guild found" : "no guild");
      const channel = await guild.channels.fetch(poll.channelID);

      const message = await channel.messages.fetch(poll.messageID);

      let reactionWinnerCount = -1;
      let reactionWinnerIndex = 0;
      for (let i = 0; i < poll.emojis.length; i++) {
        const communityAddr = await getCommunityFromActivities(
          poll.activitiesAddress
        );

        const relevantDiscordIds = await getRelevantDiscordIDs(
          communityAddr,
          poll.role
        );
        console.log('relevantDiscordIds', relevantDiscordIds);
        const userReactionsMapping = await message.reactions.resolve(poll.emojis[i]).users.fetch();
        var reactedUserIds = Array.from(userReactionsMapping.keys());
        const relevantReactions = reactedUserIds.filter(value => relevantDiscordIds.includes(value));

        if (
          reactionWinnerCount < relevantReactions.length
        ) {
          reactionWinnerCount = relevantReactions.length;
          reactionWinnerIndex = i;
        }

        // finalize activity onchain
        await finalizeActivity(
          poll.activitiesAddress,
          poll.activityId,
          [],
          poll.emojis[reactionWinnerIndex],
          reactionWinnerCount
        );
      }

      // close Poll
      const pollContent = message.embeds[0];

      console.log("reactionWinnerCount", reactionWinnerCount);
      console.log("reactionWinnerIndex", reactionWinnerIndex);
      console.log(poll.emojis[reactionWinnerIndex]);

      let winnersText;
      if (reactionWinnerCount == 1) {
        winnersText = "No one voted!";
      } else {
        winnersText =
          poll.emojis[reactionWinnerIndex] +
          " (" +
          (reactionWinnerCount) +
          " vote(s))\n";
      }
      pollContent.addField("**Winner:**", winnersText);
      pollContent.setTimestamp();
      channel.send({ embeds: [pollContent] });

      deletePoll(poll._id);
    }
  });
}
// setInterval(() => closePolls(), 2000);

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

async function getRelevantDiscordIDs(communityAddr, role) {
  const allMembers = await getSkillWalletsPerCommunity(communityAddr);
  const relevantDiscordIds = [];

  for (let i = 0; i < allMembers.length; i++) {
    if (role != 0) {
      const userRole = await getRole(allMembers[i]);
      if (userRole.toString() == role.toString()) {
        const discordId = await getDiscordID(allMembers[i]);
        relevantDiscordIds.push(discordId.toString());
      }
    }
  }

  return relevantDiscordIds;
}
