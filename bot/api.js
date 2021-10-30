
const axios = require('axios');

const getDiscordConnectNonce = async () => {
    // TODO: change action!
    const resp = await axios.post(`https://api.skillwallet.id/api/skillwallet/-1/nonces?action=1`);
    return resp.data;
}
const getCommunityDetails = async (key) => {
    const resp = await axios.get(`https://api.distributed.town/api/community/key/${key}`);
    return resp.data;
}

module.exports = { getDiscordConnectNonce, getCommunityDetails }