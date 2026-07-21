/**
 * 页面预览用 Mock 数据
 * API 无数据时用于占位；首页/我的使用真实动物图
 */

const BASE = '/assets/mock';

/** 真实动物图（首页 / 我的） */
const REAL = {
  avatar: `${BASE}/real_avatar.jpg`,
  tallDog: `${BASE}/real_tall_dog.jpg`,
  cat: `${BASE}/real_cat.jpg`,
  pup: `${BASE}/real_pup.jpg`,
  hero: `${BASE}/real_hero.jpg`,
  svc1: `${BASE}/real_svc1.jpg`,
  svc2: `${BASE}/real_svc2.jpg`,
};

/** 卡通人物头像（服务商 / 求助） */
const AVATARS = {
  doudou: REAL.avatar,
  golden: REAL.pup,
  kitty: REAL.cat,
  fluffy: REAL.svc1,
  provider1: `${BASE}/provider1.png`,
  provider2: `${BASE}/provider2.png`,
  provider3: `${BASE}/provider3.png`,
  helper1: `${BASE}/helper1.png`,
  helper2: `${BASE}/helper2.png`,
  helper3: `${BASE}/helper3.png`,
};

/** 封面图 */
const COVERS = {
  tallDog: REAL.tallDog,
  sideCat: REAL.cat,
  sidePup: REAL.pup,
  heroDog: REAL.hero,
  clap: `${BASE}/clap.png`,
};

/** 默认宠物档案 */
const MOCK_PET = {
  name: '豆豆',
  breed: '柴犬',
  age: '2岁',
  days: 420,
  weight: '6.2 kg',
  recordDays: '20 天',
  visits: '3 次',
  avatar: REAL.avatar,
  cover: REAL.hero,
};

/** 首页瀑布流 Mock */
const MOCK_FEED = {
  feedMain: {
    id: 'mock-main',
    kind: 'idle',
    image: COVERS.tallDog,
  },
  feedSide: [
    {
      id: 'mock-s1',
      kind: 'service',
      title: '小猫',
      rating: 4,
      stars: [1, 2, 3, 4],
      image: COVERS.sideCat,
    },
    {
      id: 'mock-s2',
      kind: 'idle',
      title: '金毛',
      image: COVERS.sidePup,
    },
  ],
};

/** 热门服务 Mock */
const MOCK_SERVICES_MINI = [
  {
    id: 'mock-svc-1',
    name: '精致洗护套餐',
    price: 128,
    coverUrls: [REAL.svc1],
    categoryIcon: '🛁',
  },
  {
    id: 'mock-svc-2',
    name: '上门喂养 · 半天',
    price: 68,
    coverUrls: [REAL.svc2],
    categoryIcon: '🍼',
  },
  {
    id: 'mock-svc-3',
    name: '健康体检基础版',
    price: 199,
    coverUrls: [REAL.pup],
    categoryIcon: '💊',
  },
];

/** 服务商列表 Mock */
const MOCK_PROVIDERS = [
  {
    id: 'mock-p1',
    name: '阿斯特宠物护理',
    subtitle: '专业上门喂养 · 准时守信 · 照片打卡',
    merchantName: '阿斯特服务商',
    merchantLogoUrl: AVATARS.provider1,
    coverUrls: [AVATARS.provider1],
    merchantRating: 5,
  },
  {
    id: 'mock-p2',
    name: '艾西娜美容中心',
    subtitle: '温和美容 · 无泪配方 · 造型师一对一',
    merchantName: '艾西娜服务商',
    merchantLogoUrl: AVATARS.provider2,
    coverUrls: [AVATARS.provider2],
    merchantRating: 5,
  },
  {
    id: 'mock-p3',
    name: '米娅健康诊所',
    subtitle: '基础体检 · 疫苗接种 · 驱虫提醒',
    merchantName: '米娅诊所',
    merchantLogoUrl: AVATARS.provider3,
    coverUrls: [AVATARS.provider3],
    merchantRating: 5,
  },
];

/** 闲置商品 Mock */
const MOCK_IDLE_ITEMS = [
  {
    id: 'mock-i1',
    title: '宠物卫衣 · 小号',
    images: [],
    conditionLevel: 2,
    conditionText: '九成新',
    displayIcon: '👕',
    price: 0,
  },
  {
    id: 'mock-i2',
    title: '陶瓷饮水碗',
    images: [],
    conditionLevel: 2,
    conditionText: '九成新',
    displayIcon: '☕',
    price: 15,
  },
  {
    id: 'mock-i3',
    title: '外出收纳箱',
    images: [],
    conditionLevel: 3,
    conditionText: '轻微使用',
    displayIcon: '📦',
    price: 39,
  },
  {
    id: 'mock-i4',
    title: '磨牙玩具套装',
    images: [],
    conditionLevel: 2,
    conditionText: '九成新',
    displayIcon: '🦴',
    price: 0,
  },
];

/** 宠物求助 Mock */
const MOCK_HELP_CARDS = [
  {
    id: 1,
    icon: '🤝',
    avatar: AVATARS.helper1,
    title: '邻里互助',
    desc: '出差三天，求帮忙喂猫',
  },
  {
    id: 2,
    icon: '🚑',
    avatar: AVATARS.helper2,
    title: '紧急照看',
    desc: '临时加班，需要遛狗',
  },
  {
    id: 3,
    icon: '📦',
    avatar: AVATARS.helper3,
    title: '闲置流转',
    desc: '二手猫爬架免费送',
  },
];

module.exports = {
  REAL,
  AVATARS,
  COVERS,
  MOCK_PET,
  MOCK_FEED,
  MOCK_SERVICES_MINI,
  MOCK_PROVIDERS,
  MOCK_IDLE_ITEMS,
  MOCK_HELP_CARDS,
};
