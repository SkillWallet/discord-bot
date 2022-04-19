const { Schema, model } = require("mongoose");

const GuildPerPartner = new Schema({
  guildID: { type: String },
  key: { type: String },
  communityAddress: { type: String },
});

const GuildPerPartnerModel = model("GuildPerPartners", GuildPerPartner);

const Poll = new Schema({
  guildID: { type: String },
  channelID: { type: String },
  messageID: { type: String },
  endDate: { type: String },
  emojis: { type: Array },
  activitiesAddress: { type: String },
  activityId: { type: String },
  role: { type: String },
});

const PollModel = model("Poll", Poll);

const getAllPolls = async () => {
  const polls = await PollModel.find().exec();
  return polls;
};

const insertPoll = async (guildID, channelID, messageID, endDate, emojis, activitiesAddress, activityId, role) => {
  const guild = new PollModel({
    guildID,
    channelID,
    messageID,
    endDate,
    emojis,
    activitiesAddress, 
    activityId,
    role
  });

  return guild.save();}

const deletePoll = async (id) => {
  await PollModel.deleteOne(id).exec();
};

const getGuildPerKey = async (key) => {
  const guild = await GuildPerPartnerModel.findOne({ key }).exec();
  return guild ? guild.guildID : undefined;
};

const getGuildPerCommunity = async (communityAddress) => {
  const guild = await GuildPerPartnerModel.findOne({ communityAddress }).exec();
  return guild ? guild.guildID : undefined;
};

const addGuild = (guildID, key, communityAddress) => {
  const guild = new GuildPerPartnerModel({
    communityAddress,
    key,
    guildID,
  });

  return guild.save();
};

module.exports = { 
  getGuildPerCommunity, 
  getGuildPerKey, 
  addGuild,
  getAllPolls,
  insertPoll,
  deletePoll 
};
