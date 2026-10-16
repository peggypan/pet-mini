const { appSettings } = require('./db');

const DEFAULT_COMMUNITY_CONFIG = {
  hotTopics: [
    { id: 't1', name: '#携宠露营', posts: 0, hot: true },
    { id: 't2', name: '#猫咪喂养', posts: 0, hot: false },
    { id: 't3', name: '#避雷宠物店', posts: 0, hot: true },
  ],
  zones: [
    { id: 'cat', name: '猫猫', icon: '🐱', enabled: true },
    { id: 'dog', name: '狗狗', icon: '🐶', enabled: true },
    { id: 'other', name: '异宠', icon: '🦔', enabled: true },
    { id: 'activity', name: '宠物活动', icon: '🎉', enabled: true },
    { id: 'photo', name: '宠物摄影', icon: '📷', enabled: true },
    { id: 'social', name: '交友', icon: '🤝', enabled: true },
    { id: 'expose', name: '爆料', icon: '📢', enabled: true },
  ],
};

async function loadCommunityConfigRaw() {
  try {
    const got = await appSettings().doc('community').get();
    if (got.data) {
      return {
        hotTopics: got.data.hotTopics || DEFAULT_COMMUNITY_CONFIG.hotTopics,
        zones: got.data.zones || DEFAULT_COMMUNITY_CONFIG.zones,
        updatedAt: got.data.updatedAt,
      };
    }
  } catch (e) {
    /* missing doc */
  }
  return { ...DEFAULT_COMMUNITY_CONFIG, updatedAt: null };
}

module.exports = {
  DEFAULT_COMMUNITY_CONFIG,
  loadCommunityConfigRaw,
};
