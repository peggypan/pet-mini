const { ok } = require('../common/response');
const { loadCommunityConfigRaw } = require('../common/community-config');

/** 小程序端读取社区话题与分区（无需 admin） */
async function getCommunityConfig(_payload, _wxContext) {
  const cfg = await loadCommunityConfigRaw();
  const hotTopics = (cfg.hotTopics || []).map((t) => ({
    id: String(t.id || t.name),
    name: String(t.name || ''),
    posts: Number(t.posts) || 0,
    hot: !!t.hot,
  }));
  const zones = (cfg.zones || [])
    .filter((z) => z.enabled !== false)
    .map((z) => ({
      id: String(z.id),
      name: String(z.name || z.id),
      icon: z.icon ? String(z.icon) : '🐾',
      enabled: true,
    }));

  return ok({
    hotTopics,
    zones,
    topicNames: hotTopics.map((t) => t.name).filter(Boolean),
    updatedAt: cfg.updatedAt,
  });
}

module.exports = {
  getCommunityConfig,
};
