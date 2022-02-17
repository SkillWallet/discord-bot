module.exports = {
  config: {
    messages: {
      prefixes: {
        importRoles: '/import-roles',
        postPoll: '/post-poll',
        connectSW: '/connect-sw',
        getVoiceChatData: '/get-voice-chat-data',
        clearVoiceChat: '/voice-chat-clear',
      }
    },
    roles: {
      colors: ['BLUE', 'GREEN', 'PURPLE'],
    },
    emojiRegex: /\p{RI}\p{RI}|\p{Emoji}(\p{EMod}+|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(\u{200D}\p{Emoji}(\p{EMod}+|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)+|\p{EPres}(\p{EMod}+|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?|\p{Emoji}(\p{EMod}+|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})/gu,
  }
}