const cloudApi = require('./cloud-api');
const { MOCK_SOCIAL } = require('./mock');
const communityZones = require('./community-zones');

const CACHE_KEY = 'community_config_cache_v1';
const TTL_MS = 5 * 60 * 1000;

let memoryCache = null;
let refreshPromise = null;

function readStorageCache() {
  try {
    const raw = wx.getStorageSync(CACHE_KEY);
    if (!raw || !raw.at) return null;
    if (Date.now() - raw.at > TTL_MS) return null;
    return raw.data;
  } catch (e) {
    return null;
  }
}

function writeStorageCache(data) {
  try {
    wx.setStorageSync(CACHE_KEY, { at: Date.now(), data });
  } catch (e) {
    /* ignore */
  }
}

function mergeZones(cloudZones) {
  const staticAll = communityZones.COMMUNITY_ZONES;
  const enabled = (cloudZones || []).filter((z) => z.enabled !== false);
  const enabledIds = new Set(enabled.map((z) => String(z.id)));
  const allCell = staticAll[0];
  const merged = enabled
    .map((cz) => {
      const base = staticAll.find((z) => z.id === cz.id);
      if (!base) {
        return {
          id: cz.id,
          name: cz.name || cz.id,
          icon: cz.icon || '🐾',
          desc: '',
          theme: cz.id,
        };
      }
      return {
        ...base,
        name: cz.name || base.name,
        icon: cz.icon || base.icon,
      };
    })
    .filter((z) => enabledIds.has(String(z.id)));
  return [allCell, ...merged];
}

function fallbackConfig() {
  return {
    hotTopics: MOCK_SOCIAL.topics,
    communityZones: communityZones.COMMUNITY_ZONES,
    postZones: communityZones.POST_ZONES,
    topicNames: MOCK_SOCIAL.topics.map((t) => t.name),
  };
}

function normalizeCloudData(data) {
  const hotTopics =
    data && Array.isArray(data.hotTopics) && data.hotTopics.length
      ? data.hotTopics
      : MOCK_SOCIAL.topics;
  const communityZones = mergeZones(data && data.zones);
  const postZones = communityZones.filter((z) => z.id !== 'all');
  const topicNames =
    data && Array.isArray(data.topicNames) && data.topicNames.length
      ? data.topicNames
      : hotTopics.map((t) => t.name);
  return { hotTopics, communityZones, postZones, topicNames };
}

function getCachedCommunityConfig() {
  if (memoryCache) return memoryCache;
  const stored = readStorageCache();
  if (stored) {
    memoryCache = stored;
    return stored;
  }
  return fallbackConfig();
}

async function refreshCommunityConfigFromCloud(options) {
  const force = !!(options && options.force);
  if (!force && memoryCache) return memoryCache;
  if (!cloudApi.cloudEnabled()) {
    memoryCache = fallbackConfig();
    communityZones.setRuntimeCommunityZones(memoryCache.communityZones);
    return memoryCache;
  }
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const data = await cloudApi.callApi('app_settings', 'getCommunityConfig', {});
      const cfg = normalizeCloudData(data);
      memoryCache = cfg;
      writeStorageCache(cfg);
      communityZones.setRuntimeCommunityZones(cfg.communityZones);
      return cfg;
    } catch (e) {
      const cfg = getCachedCommunityConfig();
      communityZones.setRuntimeCommunityZones(cfg.communityZones);
      return cfg;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/** 拉取配置并写入 Page data（communityZones / hotTopics / zones） */
async function applyCommunityUiToPage(page, extraKeys) {
  const cfg = await refreshCommunityConfigFromCloud({});
  const patch = {
    communityZones: cfg.communityZones,
    hotTopics: cfg.hotTopics,
    ...(extraKeys && extraKeys.zones ? { zones: cfg.postZones } : {}),
    ...(extraKeys && extraKeys.topics ? { topics: cfg.hotTopics } : {}),
  };
  if (page && typeof page.setData === 'function') {
    page.setData(patch);
  }
  return cfg;
}

module.exports = {
  refreshCommunityConfigFromCloud,
  getCachedCommunityConfig,
  applyCommunityUiToPage,
  getHotTopicNames() {
    return getCachedCommunityConfig().topicNames;
  },
};
