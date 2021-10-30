class VoiceChannelsDetailsStorage {

    constructor() { 
        this.voiceUsers = [];
        this.userIDs = [];
    }

    add(userID, voiceUser) {
        this.voiceUsers[userID] = voiceUser;
        this.userIDs.push(userID);
    }

    edit(userID, newUser) {
        if (!this.voiceUsers[userID])
            return;
        this.voiceUsers[userID] = newUser;
    }

    clear() {
        this.voiceUsers = [];
        this.userIDs = [];
    }

    get(userID) {
        return this.voiceUsers[userID];
    }
    
    getUserIDs() {
        return this.userIDs;
    }
}

module.exports = { VoiceChannelsDetailsStorage }