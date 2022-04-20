require("dotenv").config();

// imports
const { Client, MessageEmbed, Intents } = require("discord.js");
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
  connect(process.env.MONGODB_CONNECTION_STRING);
  console.log(`SkillWallet Discord Bot listening on port 6005`);
});

// constants
const {
  messages: { prefixes },
  roles: { colors },
} = config;

// init
const bot = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});
setInterval(() => closePolls(), 1000 * 60 * 60 * 24); // 24 hours!
bot.login(process.env.TOKEN);

// events actions
bot.on("ready", () => {
  console.info(`Logged in as ${bot.user.tag}!`);
  closePolls();

});

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
  }
});

async function postPoll(req, res) {
  res.sendStatus(200);
  const community = req.body.communityAddress;
  const guildId = await getGuildPerCommunity(community);

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
        console.log("relevantDiscordIds", relevantDiscordIds);
        const userReactionsMapping = await message.reactions
          .resolve(poll.emojis[i])
          .users.fetch();
        var reactedUserIds = Array.from(userReactionsMapping.keys());
        const relevantReactions = reactedUserIds.filter((value) =>
          relevantDiscordIds.includes(value)
        );

        if (reactionWinnerCount < relevantReactions.length) {
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
          reactionWinnerCount +
          " vote(s))\n";
      }
      pollContent.addField("**Winner:**", winnersText);
      pollContent.setTimestamp();
      channel.send({ embeds: [pollContent] });

      deletePoll(poll._id);
    }
  });
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
