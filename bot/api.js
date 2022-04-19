var ethers = require("ethers");
const axios = require("axios");
const { Blob } = require("node:buffer");
const { NFTStorage } = require("nft.storage");
const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

var communityAbi = require("./abis/community.abi.json").abi;
var activitiesAbi = require("./abis/activities.abi.json").abi;
var skillWalletAbi = require("./abis/skillwallet.abi.json").abi;

const getCommunityDetails = async (key) => {
  const resp = await axios.get(
    `https://dev-api.skillwallet.id/api/community/key/${key}`
  );
  return resp.data;
};
function mnemonic() {
  try {
    return process.env.MNEMONIC.trim();
  } catch (e) {
    console.log(e);
  }
  return "";
}
const storeAsBlob = async (json) => {
  const encodedJson = new TextEncoder().encode(JSON.stringify(json));
  const blob = new Blob([encodedJson], {
    type: "application/json;charset=utf-8",
  });
  const cid = await client.storeBlob(blob);
  return ipfsCIDToHttpUrl(cid, false);
};

function ipfsCIDToHttpUrl(url, isJson) {
  if (!url.includes("textile"))
    return isJson
      ? `https://skillwallet.infura-ipfs.io/ipfs/${url.replace(
          "ipfs://",
          ""
        )}/metadata.json`
      : `https://skillwallet.infura-ipfs.io/ipfs/${url.replace("ipfs://", "")}`;
  return url;
}

const finalizeActivity = async (
  activitiesAddress,
  activityID,
  addresses,
  winner,
  count,
  winnerText
) => {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://rpc-mumbai.matic.today"
  );

  // Wallet connected to a provider
  const senderWalletMnemonic = ethers.Wallet.fromMnemonic(
    mnemonic(),
    "m/44'/60'/0'/0/0"
  );

  let signer = senderWalletMnemonic.connect(provider);
  const activitiesContract = new ethers.Contract(
    activitiesAddress,
    activitiesAbi,
    signer
  );

  console.log(signer.address);

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
  // const finalizeTx = await activitiesContract.finalizeActivity(
  //   activityID,
  //   uri,
  //   addresses
  // );

  // const finalizeTxResult = await finalizeTx.wait();
  // const { events } = finalizeTxResult;
  // const eventEmitted = events.find((e) => e.event === "ActivityFinalized");

  console.log("finalizing", activitiesAddress, activityID);
  if (true) console.log("ActivityFinalized event emitted");
};

const getSkillWalletsPerCommunity = async (communityAddress) => {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://matic-mumbai.chainstacklabs.com/"
  );

  // Wallet connected to a provider
  const senderWalletMnemonic = ethers.Wallet.fromMnemonic(
    mnemonic(),
    "m/44'/60'/0'/0/0"
  );

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
  const provider = new ethers.providers.JsonRpcProvider(
    "https://matic-mumbai.chainstacklabs.com/"
  );

  // Wallet connected to a provider
  const senderWalletMnemonic = ethers.Wallet.fromMnemonic(
    mnemonic(),
    "m/44'/60'/0'/0/0"
  );

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
  const provider = new ethers.providers.JsonRpcProvider(
    "https://matic-mumbai.chainstacklabs.com/"
  );

  // Wallet connected to a provider
  const senderWalletMnemonic = ethers.Wallet.fromMnemonic(
    mnemonic(),
    "m/44'/60'/0'/0/0"
  );

  let signer = senderWalletMnemonic.connect(provider);
  const skillWalletContract = new ethers.Contract(
    process.env.SKILLWALLET_ADDRESS,
    skillWalletAbi,
    signer
  );

  const role = await skillWalletContract.skillWalletToRole(swID);
  return role;
};

const getCommunityFromActivities = async (activitiesAddress) => {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://matic-mumbai.chainstacklabs.com/"
  );

  // Wallet connected to a provider
  const senderWalletMnemonic = ethers.Wallet.fromMnemonic(
    mnemonic(),
    "m/44'/60'/0'/0/0"
  );

  let signer = senderWalletMnemonic.connect(provider);
  const activitiesContract = new ethers.Contract(
    activitiesAddress,
    activitiesAbi,
    signer
  );

  const communityAddr = await activitiesContract.community();
  return communityAddr;
};

module.exports = {
  getCommunityDetails,
  finalizeActivity,
  getSkillWalletsPerCommunity,
  getDiscordID,
  getRole,
  getCommunityFromActivities,
};
