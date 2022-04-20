require("dotenv").config();
var ethers = require("ethers");
const axios = require("axios");

var communityAbi = require("./abis/community.abi.json").abi;
var activitiesAbi = require("./abis/activities.abi.json").abi;
var skillWalletAbi = require("./abis/skillwallet.abi.json").abi;
const { storeAsBlob } = require('./ipfs.helper');

const provider = new ethers.providers.JsonRpcProvider(
  'https://rpc-mumbai.matic.today'
);

// Wallet connected to a provider
const senderWalletMnemonic = ethers.Wallet.fromMnemonic(
  process.env.MNEMONIC,
  "m/44'/60'/0'/0/0"
);

let signer = senderWalletMnemonic.connect(provider);

const getCommunityDetails = async (key) => {
  const resp = await axios.get(
    `${process.env.SW_API_URL}/api/community/key/${key}`
  );
  return resp.data;
};

const finalizeActivity = async (
  activitiesAddress,
  activityID,
  addresses,
  winner,
  count,
  winnerText
) => {
  console.log('finalizeActivity');
  const activitiesContract = new ethers.Contract(
    activitiesAddress,
    activitiesAbi,
    signer
  );

  const metadataURI = await activitiesContract.tokenURI(activityID);
  const metadata = axios.get(metadataURI);
  const finalizeMetadata = {
    ...metadata,
    winner,
    count,
    winnerText,
  };

  const uri = await storeAsBlob(finalizeMetadata);
  console.log("uri", uri);
  console.log("finalizing", activitiesAddress, activityID);
  const finalizeTx = await activitiesContract.finalizeActivity(
    activityID,
    uri,
    addresses
  );

  const finalizeTxResult = await finalizeTx.wait();
  const { events } = finalizeTxResult;
  const eventEmitted = events.find((e) => e.event === "ActivityFinalized");

  console.log("finalizing", activitiesAddress, activityID);
  if (eventEmitted) console.log("ActivityFinalized event emitted");
};

const getSkillWalletsPerCommunity = async (communityAddress) => {
  let signer = senderWalletMnemonic.connect(provider);
  const communtiyContract = new ethers.Contract(
    communityAddress,
    communityAbi,
    signer
  );

  const members = await communtiyContract.getMembers();
  return members;
};

const getDiscordID = async (swID) => {
  let signer = senderWalletMnemonic.connect(provider);
  const skillWalletContract = new ethers.Contract(
    process.env.SKILLWALLET_ADDRESS,
    skillWalletAbi,
    signer
  );

  const discordID = await skillWalletContract.skillWalletToDiscordID(swID);
  return discordID;
};

const getRole = async (swID) => {
  const skillWalletContract = new ethers.Contract(
    process.env.SKILLWALLET_ADDRESS,
    skillWalletAbi,
    signer
  );

  const role = await skillWalletContract.skillWalletToRole(swID);
  return role;
};

const getCommunityFromActivities = async (activitiesAddress) => {
  const activitiesContract = new ethers.Contract(
    activitiesAddress,
    activitiesAbi,
    signer
  );

  const communityAddr = await activitiesContract.community();
  return communityAddr;
};

module.exports = {
  getRole,
  getDiscordID,
  finalizeActivity,
  getCommunityDetails,
  getSkillWalletsPerCommunity,
  getCommunityFromActivities,
};
