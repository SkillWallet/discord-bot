
const axios = require('axios');

const getCommunityDetails = async (key) => {
    const resp = await axios.get(`https://dev-api.distributed.town/api/community/key/${key}`);
    return resp.data;
}

module.exports = { getCommunityDetails }