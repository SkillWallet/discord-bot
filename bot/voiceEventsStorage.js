
class VoiceChannelsDetailsStorage {

    constructor() {
        this.guilds = {};
    }

    add(guildID) {
        this.guilds[guildID] = {
            users: {}
        }
    }

    addOrEditUserData(guildID, userID, userData) {
        if (!this.guilds[guildID])
            this.add(guildID);
        let guild = this.guilds[guildID];
        if (!guild) {
            this.add(guildID);
            guild = this.guilds[guildID];
        }
        this.guilds[guildID].users[userID] = userData;
        return this.guilds[guildID].users[userID];
    }

    clearGuildData(guildID) {
        this.guilds[guildID] = [];
    }

    getVoiceChannelData(guildID) {
        if (!this.guilds[guildID])
            this.add(guildID);
        return this.guilds[guildID];
    }

    getUserVoiceChannelData(guildID, userID) {
        if (!this.guilds[guildID])
            this.add(guildID);

        return this.guilds[guildID].users[userID];
    }
}

module.exports = { VoiceChannelsDetailsStorage }