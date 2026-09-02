/**
 * 目录查找：Mock + 本地发布项，供详情/下单页使用
 */
const {
  MOCK_PROVIDERS,
  MOCK_SERVICES_MINI,
  MOCK_IDLE_ITEMS,
  MOCK_MALL,
  MOCK_HEALTH,
  MOCK_SOCIAL,
} = require('./mock');
const store = require('./store');

function enrichProvider(p) {
  const priceMap = { 'mock-p1': 68, 'mock-p2': 128, 'mock-p3': 199 };
  const price = p.price || priceMap[p.id] || 99;
  return {
    ...p,
    price,
    originalPrice: p.originalPrice || Math.round(price * 1.3),
    unit: p.unit || '次',
    salesCount: p.salesCount || 126,
    rating: p.rating || p.merchantRating || 5,
    description:
      p.description ||
      `${p.subtitle || p.name}。服务含基础保障：${(p.guarantees || []).join('、') || '实名认证'}。`,
    coverUrls: p.coverUrls?.length ? p.coverUrls : ['/assets/mock/real_svc1.jpg'],
    merchant: p.merchant || {
      name: p.merchantName || '服务商',
      logoUrl: p.merchantLogoUrl || p.coverUrls?.[0],
      district: '同城',
      address: '上门服务',
      rating: p.merchantRating || 5,
      reviewCount: 48,
      orderCount: 200,
    },
  };
}

function findService(id) {
  const sid = String(id);
  const fromMini = MOCK_SERVICES_MINI.find((x) => String(x.id) === sid);
  if (fromMini) {
    return enrichProvider({
      ...fromMini,
      subtitle: fromMini.name,
      merchantName: '宠头头优选',
      merchantLogoUrl: fromMini.coverUrls?.[0],
      merchantRating: 5,
      guarantees: ['实名认证', '意外险', '全程拍照'],
    });
  }
  const fromProvider = MOCK_PROVIDERS.find((x) => String(x.id) === sid);
  if (fromProvider) return enrichProvider(fromProvider);
  return null;
}

function enrichIdle(item) {
  const CONDITION_MAP = ['全新', '九成新', '轻微使用', '明显使用'];
  const level = item.conditionLevel || 2;
  const seller = item.seller || item.user || { nickname: '同城宠友' };
  return {
    ...item,
    title: item.title || '闲置好物',
    description: item.description || `${item.title}，成色良好，同城优先。禁止活体交易。`,
    images: item.images?.length ? item.images : [],
    price: item.price == null ? 0 : Number(item.price),
    conditionLevel: level,
    conditionText: item.conditionText || CONDITION_MAP[level - 1] || '九成新',
    displayIcon: item.displayIcon || '📦',
    location: item.location || '同城自取',
    tradeType: item.tradeType || 3,
    seller,
    user: item.user || {
      nickname: seller.nickname || '同城宠友',
      avatarUrl: seller.avatarUrl || '/assets/mock/real_avatar.jpg',
    },
  };
}

function findIdleItem(id) {
  const sid = String(id);
  const local = store.findLocalIdleItem(sid);
  if (local) return enrichIdle(local);
  const mock = MOCK_IDLE_ITEMS.find((x) => String(x.id) === sid);
  if (mock) return enrichIdle(mock);
  return null;
}

function findMallProduct(id) {
  return (MOCK_MALL.products || []).find((x) => String(x.id) === String(id)) || null;
}

function getDefaultPets() {
  const local = store.listPets();
  if (local.length) return local;
  return (MOCK_HEALTH.pets || []).map((p) => ({ ...p }));
}

function findSocialPost(id) {
  const sid = String(id);
  const local = store.getSocialPost(sid);
  if (local) return { ...local };
  const mock = (MOCK_SOCIAL.posts || []).find((p) => String(p.id) === sid);
  if (!mock) return null;
  const override = store.getSocialOverride(sid);
  return { ...mock, ...(override || {}) };
}

module.exports = {
  findService,
  findIdleItem,
  findMallProduct,
  getDefaultPets,
  findSocialPost,
  enrichProvider,
  enrichIdle,
};
