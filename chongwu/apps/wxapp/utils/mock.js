/**
 * 页面预览用 Mock 数据
 * 对齐《宠物小程序页面优化方案》
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
  {
    id: 'mock-svc-1',
    name: '精致洗护套餐',
    price: 128,
    coverUrls: [REAL.svc1],
    categoryIcon: '🛁',
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
    guarantees: ['实名认证', '意外险', '全程拍照'],
  },
  {
    id: 'mock-p2',
    name: '艾西娜美容中心',
    subtitle: '温和美容 · 无泪配方 · 造型师一对一',
    merchantName: '艾西娜服务商',
    merchantLogoUrl: AVATARS.provider2,
    coverUrls: [AVATARS.provider2],
    merchantRating: 5,
    guarantees: ['实名认证', '意外险'],
  },
  {
    id: 'mock-p3',
    name: '米娅健康诊所',
    subtitle: '基础体检 · 疫苗接种 · 驱虫提醒',
    merchantName: '米娅诊所',
    merchantLogoUrl: AVATARS.provider3,
    coverUrls: [AVATARS.provider3],
    merchantRating: 5,
    guarantees: ['实名认证', '全程拍照'],
  },
];

/** 闲置商品 Mock（仅用品，无活体） */
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

/** 宠物交友 / 社交动态 Mock（优化后） */
const MOCK_SOCIAL = {
  // 发帖｜同城活动｜附近宠友｜话题广场
  actions: [
    { id: 'post', name: '发帖', icon: '✎' },
    { id: 'event', name: '同城活动', icon: '🎉' },
    { id: 'nearby', name: '附近宠友', icon: '📍' },
    { id: 'topic', name: '话题广场', icon: '#' },
  ],
  filters: [
    { id: 'all', name: '全部' },
    { id: 'cat', name: '猫咪专区' },
    { id: 'dog', name: '狗狗专区' },
    { id: 'other', name: '异宠' },
    { id: 'event', name: '活动召集' },
  ],
  events: [
    {
      id: 'e1',
      tag: '本周六',
      title: '朝阳公园狗狗社交趴',
      desc: '自带牵引绳 · 已有 28 人报名',
      cover: REAL.pup,
      zone: 'dog',
      fee: '免费',
      place: '朝阳公园南门',
      seats: '还剩 12 名额',
      require: '须带疫苗本',
    },
    {
      id: 'e2',
      tag: '本周日',
      title: '喵星人咖啡馆见面会',
      desc: '温馨室内局 · 已有 16 人报名',
      cover: REAL.cat,
      zone: 'cat',
      fee: '¥39 / 人',
      place: '三里屯 · 猫咖',
      seats: '还剩 6 名额',
      require: '须带疫苗本',
    },
  ],
  posts: [
    {
      id: 'p1',
      userName: '小橘妈',
      petName: '橘子',
      avatar: REAL.cat,
      time: '10 分钟前',
      zone: 'cat',
      content: '周末有没有朝阳附近一起遛猫社交的？橘子最近交友欲超强 🐾',
      likes: 24,
      comments: 8,
      liked: false,
      essence: false,
      shares: 3,
    },
    {
      id: 'p2',
      userName: '阿柴爸爸',
      petName: '团团',
      avatar: REAL.avatar,
      time: '1 小时前',
      zone: 'dog',
      content: '分享一张团团第一次见朋友的照片，尾巴摇成螺旋桨了～',
      likes: 56,
      comments: 13,
      liked: true,
      image: REAL.tallDog,
      essence: true,
      shares: 12,
    },
    {
      id: 'p3',
      userName: '奶盖屋',
      petName: '奶盖',
      avatar: REAL.svc2,
      time: '昨天',
      zone: 'cat',
      content: '求推荐温和的宠物社交场，家里宝宝有点社恐，想慢慢适应。',
      likes: 18,
      comments: 21,
      liked: false,
      essence: false,
      shares: 5,
    },
    {
      id: 'p4',
      userName: '异宠研究所',
      petName: '小刺',
      avatar: REAL.pup,
      time: '2 天前',
      zone: 'other',
      content: '有没有养刺猬的朋友？想交流一下换笼和温湿度经验。',
      likes: 9,
      comments: 6,
      liked: false,
      essence: false,
      shares: 1,
    },
  ],
  /** 分享裂变激励文案 */
  invite: {
    rewardTitle: '分享有礼',
    rewardDesc: '好友通过你的分享进入，双方各得 ¥5 商城券',
    shareTitle: '来宠头头交友广场，遇见同城宠友～',
  },
};

/** 健康档案 Mock（二期：到期提醒） */
const MOCK_HEALTH = {
  pets: [
    {
      id: 'hp1',
      name: '豆豆',
      species: 2,
      gender: 1,
      isSterilized: true,
      birthday: '2022-05-12',
      avatarUrl: REAL.avatar,
    },
    {
      id: 'hp2',
      name: '奶盖',
      species: 1,
      gender: 2,
      isSterilized: false,
      birthday: '2023-11-03',
      avatarUrl: REAL.cat,
    },
  ],
  reminders: [
    {
      id: 'hr1',
      itemName: '狂犬疫苗',
      validUntil: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 5);
        return d.toISOString().slice(0, 10);
      })(),
      notifyOn: true,
      pet: { name: '豆豆', avatarUrl: REAL.avatar },
    },
    {
      id: 'hr2',
      itemName: '体内驱虫',
      validUntil: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 12);
        return d.toISOString().slice(0, 10);
      })(),
      notifyOn: true,
      pet: { name: '奶盖', avatarUrl: REAL.cat },
    },
    {
      id: 'hr3',
      itemName: '体外驱虫',
      validUntil: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 28);
        return d.toISOString().slice(0, 10);
      })(),
      notifyOn: false,
      pet: { name: '豆豆', avatarUrl: REAL.avatar },
    },
  ],
};

/** 宠物商城 Mock：常规用品 + 送检/营养咨询 */
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
      section: 'goods',
    },
    {
      id: 'm2',
      name: '冻干鸡肉零食罐',
      price: 39.9,
      origin: 49,
      tag: '新品',
      sales: '已售 860',
      cover: REAL.cat,
      section: 'goods',
    },
    {
      id: 'm3',
      name: '耐咬磨牙绳结球',
      price: 25,
      origin: 35,
      tag: '包邮',
      sales: '已售 2.4k',
      cover: REAL.pup,
      section: 'goods',
    },
    {
      id: 'm4',
      name: '温和沐浴露 500ml',
      price: 58,
      origin: 78,
      tag: '推荐',
      sales: '已售 640',
      cover: REAL.svc2,
      section: 'goods',
    },
  ],
  /** 差异化：食品送检 / 营养咨询 */
  services: [
    {
      id: 's1',
      name: '猫粮狗粮送检套餐',
      tip: '成分风险测评 · 第三方实验室',
      price: 199,
      tag: '独家',
      icon: '🔬',
    },
    {
      id: 's2',
      name: '宠物营养咨询',
      tip: '根据档案定制喂食方案',
      price: 99,
      tag: '专家',
      icon: '🥗',
    },
  ],
};

/** 首页 6 宫格（方案 A） */
const MOCK_MODULES = [
  {
    id: 1,
    name: '宠友服务',
    tip: '上门 / 美容 / 寄养预约',
    icon: '🛁',
    type: 'service',
    badge: '本周优惠',
  },
  {
    id: 2,
    name: '宠品闲置',
    tip: '赠送 · 置换 · 出售',
    icon: '🎁',
    type: 'idle',
    badge: '新品上架',
  },
  {
    id: 3,
    name: '宠物健康本',
    tip: '疫苗 · 驱虫 · 提醒',
    icon: '💚',
    type: 'health',
  },
  {
    id: 4,
    name: '寻宠招领',
    tip: '走失 / 捡到快发布',
    icon: '📢',
    type: 'lost',
    badge: '急',
  },
  {
    id: 5,
    name: '宠物交友',
    tip: '约局 · 发帖 · 话题',
    icon: '🤝',
    type: 'social',
  },
  {
    id: 6,
    name: '宠物商城',
    tip: '用品 · 送检 · 营养',
    icon: '🛒',
    type: 'mall',
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
  MOCK_SOCIAL,
  MOCK_MALL,
  MOCK_MODULES,
  MOCK_HEALTH,
};
