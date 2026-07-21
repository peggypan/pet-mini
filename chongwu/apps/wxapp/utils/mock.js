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

/** 宠物交友 / 社交动态 Mock */
const MOCK_SOCIAL = {
  actions: [
    { id: 'post', name: '发帖', icon: '✎' },
    { id: 'chat', name: '留言', icon: '💬' },
    { id: 'event', name: '活动', icon: '🎉' },
    { id: 'nearby', name: '附近', icon: '📍' },
  ],
  events: [
    {
      id: 'e1',
      tag: '本周六',
      title: '朝阳公园狗狗社交趴',
      desc: '自带牵引绳 · 已有 28 人报名',
      cover: REAL.pup,
    },
    {
      id: 'e2',
      tag: '本周日',
      title: '喵星人咖啡馆见面会',
      desc: '带疫苗本 · 已有 16 人报名',
      cover: REAL.cat,
    },
  ],
  posts: [
    {
      id: 'p1',
      userName: '小橘妈',
      petName: '橘子',
      avatar: REAL.cat,
      time: '10 分钟前',
      content: '周末有没有朝阳附近一起遛狗的？豆豆最近交友欲超强 🐾',
      likes: 24,
      comments: 8,
      liked: false,
    },
    {
      id: 'p2',
      userName: '阿柴爸爸',
      petName: '团团',
      avatar: REAL.avatar,
      time: '1 小时前',
      content: '分享一张团团第一次见朋友的照片，尾巴摇成螺旋桨了～',
      likes: 56,
      comments: 13,
      liked: true,
      image: REAL.tallDog,
    },
    {
      id: 'p3',
      userName: '奶盖屋',
      petName: '奶盖',
      avatar: REAL.svc2,
      time: '昨天',
      content: '求推荐温和的宠物社交场，家里宝宝有点社恐，想慢慢适应。',
      likes: 18,
      comments: 21,
      liked: false,
    },
  ],
};

/** 宠物商城 Mock */
const MOCK_MALL = {
  categories: [
    { id: 'food', name: '主粮', icon: '🥣' },
    { id: 'snack', name: '零食', icon: '🦴' },
    { id: 'toy', name: '玩具', icon: '🎾' },
    { id: 'care', name: '护理', icon: '🧴' },
  ],
  products: [
    {
      id: 'm1',
      name: '鲜肉无谷犬粮 2kg',
      price: 129,
      origin: 169,
      tag: '热销',
      sales: '已售 1.2k',
      cover: REAL.svc1,
    },
    {
      id: 'm2',
      name: '冻干鸡肉零食罐',
      price: 39.9,
      origin: 49,
      tag: '新品',
      sales: '已售 860',
      cover: REAL.cat,
    },
    {
      id: 'm3',
      name: '耐咬磨牙绳结球',
      price: 25,
      origin: 35,
      tag: '包邮',
      sales: '已售 2.4k',
      cover: REAL.pup,
    },
    {
      id: 'm4',
      name: '温和沐浴露 500ml',
      price: 58,
      origin: 78,
      tag: '推荐',
      sales: '已售 640',
      cover: REAL.svc2,
    },
  ],
};

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
  MOCK_SOCIAL,
  MOCK_MALL,
};
