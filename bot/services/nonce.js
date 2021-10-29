
const getDiscordConnectNonce = async () => {
    const resp = await axios.post(`https://api.skillwallet.id/api/skillwallet/-1/nonces?action=5`);
    console.log(resp);
    return resp;
}