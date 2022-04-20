const { Blob } = require("node:buffer");
const { NFTStorage } = require("nft.storage");
const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

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

module.exports = {
  storeAsBlob,
  ipfsCIDToHttpUrl,
};
