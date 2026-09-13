/**
 * 数字宠物养成
 * - 根据用户上传的宠物照片自动生成数字形象
 * - 喂养累计时长驱动体型生长
 */

const store = require('./store');
const STORAGE_KEY = 'virtual_pet_state';

const SHOP_ITEMS = [
  { id: 'food_basic', name: '普通口粮', icon: '🍖', price: 15, desc: '饱食度 +25 · 生长 +8%' },
  { id: 'food_premium', name: '豪华罐头', icon: '🥫', price: 35, desc: '饱食度 +40 · 生长 +15%' },
  { id: 'toy', name: '逗宠玩具', icon: '🎾', price: 25, desc: '玩耍效果 +15' },
  { id: 'bath_ticket', name: '洗澡券', icon: '🛁', price: 20, desc: '免费洗澡一次' },
  { id: 'energy_drink', name: '精力饮料', icon: '🥤', price: 18, desc: '精力 +35' },
];

const GROWTH_STAGES = [
  { min: 0, name: '孵化中', scale: 0.3, emoji: '🥚' },
  { min: 5, name: '幼崽期', scale: 0.45, emoji: '🐣' },
  { min: 25, name: '少年期', scale: 0.62, emoji: '🌱' },
  { min: 50, name: '成长期', scale: 0.78, emoji: '🌿' },
  { min: 80, name: '完全体', scale: 1, emoji: '✨' },
];

const DECAY_INTERVAL_MS = 30 * 60 * 1000;
const DECAY = { hunger: 3, mood: 2, clean: 2, energy: 2 };
const FEED_GROWTH = { premium: 15, basic: 8, temp: 5 };
const FEED_MINUTES = { premium: 120, basic: 60, temp: 30 };

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function readState() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}

function writeState(state) {
  wx.setStorageSync(STORAGE_KEY, state);
}

function speciesFromPet(pet) {
  if (!pet) return 'dog';
  if (pet.species === 1 || /猫/.test(pet.breedName || pet.breed || '')) return 'cat';
  if (pet.species === 3 || /兔/.test(pet.breedName || pet.breed || '')) return 'rabbit';
  return 'dog';
}

function getPhotoFromPet(pet) {
  if (!pet) return '';
  return pet.avatarUrl || pet.avatar || pet.coverUrl || pet.cover || '';
}

function getGrowthStage(progress) {
  let stage = GROWTH_STAGES[0];
  GROWTH_STAGES.forEach((s) => {
    if (progress >= s.min) stage = s;
  });
  return stage;
}

function calculateGrowth(state) {
  const feedPart = (state.totalFeedMinutes || 0) * 0.12;
  const passive = state.passiveGrowthPoints || 0;
  return clamp(Math.min(100, feedPart + passive), 0, 100);
}

function formatFeedDuration(minutes) {
  const total = Math.max(0, Math.floor(minutes || 0));
  if (total < 60) return `${total} 分钟`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}

function createDefaultState(pet) {
  const species = speciesFromPet(pet);
  const photoUrl = getPhotoFromPet(pet);
  const hasPhoto = !!photoUrl;
  return {
    name: (pet && pet.name) || '豆豆',
    species,
    profilePetId: pet && pet.id,
    photoUrl,
    photoGenerated: hasPhoto,
    photoSyncedAt: hasPhoto ? Date.now() : 0,
    level: 1,
    exp: 0,
    coins: 200,
    hunger: 85,
    mood: 85,
    clean: 85,
    energy: 85,
    growthProgress: hasPhoto ? 3 : 0,
    totalFeedCount: 0,
    totalFeedMinutes: 0,
    passiveGrowthPoints: 0,
    lastGrowthStage: 0,
    inventory: { food_basic: 2, toy: 1 },
    lastTick: Date.now(),
    lastGrowthTick: Date.now(),
    lastCheckIn: '',
    totalDays: 0,
    logs: [],
    createdAt: new Date().toISOString(),
  };
}

function pushLog(state, text) {
  state.logs.unshift({ text, time: formatTime(new Date()) });
  state.logs = state.logs.slice(0, 30);
}

function formatTime(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function expForLevel(level) {
  return level * 50;
}

function applyPassiveGrowth(state) {
  const now = Date.now();
  const elapsed = now - (state.lastGrowthTick || state.lastTick || now);
  const hours = elapsed / (3600 * 1000);
  if (hours >= 0.05) {
    const care = (state.hunger + state.mood + state.clean) / 3;
    if (care >= 50 && state.growthProgress < 100) {
      const bonus = care >= 75 ? 2.2 : 1.2;
      state.passiveGrowthPoints = (state.passiveGrowthPoints || 0) + hours * bonus;
    }
    state.growthProgress = calculateGrowth(state);
    state.lastGrowthTick = now;
    checkGrowthStageUp(state);
  }
  return state;
}

function checkGrowthStageUp(state) {
  const stage = getGrowthStage(state.growthProgress);
  const prev = state.lastGrowthStage || 0;
  if (stage.min > prev) {
    state.lastGrowthStage = stage.min;
    const msg = `${state.name}成长到了「${stage.name}」！`;
    pushLog(state, msg);
    store.pushMessage('宠物长大了', msg, 'social');
  }
}

function addFeedGrowth(state, type) {
  const points = FEED_GROWTH[type] || FEED_GROWTH.basic;
  const minutes = FEED_MINUTES[type] || FEED_MINUTES.basic;
  state.totalFeedCount = (state.totalFeedCount || 0) + 1;
  state.totalFeedMinutes = (state.totalFeedMinutes || 0) + minutes;
  state.growthProgress = calculateGrowth(state);
  checkGrowthStageUp(state);
  return { points, minutes };
}

function syncProfile(state, pet) {
  if (!pet) return state;
  if (pet.name) state.name = pet.name;
  if (pet.id) state.profilePetId = pet.id;
  state.species = speciesFromPet(pet);
  const photo = getPhotoFromPet(pet);
  if (photo && photo !== state.photoUrl) {
    const isNew = !state.photoUrl;
    state.photoUrl = photo;
    state.photoGenerated = true;
    state.photoSyncedAt = Date.now();
    if (isNew) {
      state.growthProgress = Math.max(state.growthProgress || 0, 3);
      pushLog(state, `已根据「${state.name}」的照片自动生成数字宠物！`);
      store.pushMessage('数字宠物诞生', `「${state.name}」的数字形象已生成`, 'social');
    } else {
      pushLog(state, '宠物照片已同步，数字形象已更新');
    }
    checkGrowthStageUp(state);
  }
  return state;
}

function applyDecay(state) {
  const now = Date.now();
  const elapsed = now - (state.lastTick || now);
  const ticks = Math.floor(elapsed / DECAY_INTERVAL_MS);
  if (ticks <= 0) return state;
  state.hunger = clamp(state.hunger - DECAY.hunger * ticks, 0, 100);
  state.mood = clamp(state.mood - DECAY.mood * ticks, 0, 100);
  state.clean = clamp(state.clean - DECAY.clean * ticks, 0, 100);
  state.energy = clamp(state.energy - DECAY.energy * ticks, 0, 100);
  state.lastTick = now;
  if (ticks >= 2) {
    pushLog(state, `你离开了一段时间，${state.name}有点想你了`);
  }
  return state;
}

function addExp(state, amount) {
  state.exp += amount;
  const need = expForLevel(state.level);
  while (state.exp >= need) {
    state.exp -= need;
    state.level += 1;
    const stage = getGrowthStage(state.growthProgress);
    pushLog(state, `互动升级！当前 Lv.${state.level}（${stage.name}）`);
  }
}

function getMoodKey(state) {
  const avg = (state.hunger + state.mood + state.clean + state.energy) / 4;
  if (avg >= 75) return 'happy';
  if (avg >= 50) return 'normal';
  if (avg >= 25) return 'sad';
  return 'critical';
}

const MOOD_FACE = { happy: '😊', normal: '😐', sad: '😢', critical: '😵' };

function getDialogue(state) {
  const key = getMoodKey(state);
  const stage = getGrowthStage(state.growthProgress);
  if (!state.photoUrl) {
    return '上传宠物照片，我就能变成你的专属数字宠物啦！';
  }
  if (state.growthProgress < 5) {
    return '咕噜咕噜…我在破壳中，多喂我几次就能长大！';
  }
  const lines = {
    happy: [
      `${state.name}开心地围着你转圈圈！`,
      `已经是${stage.name}啦，继续喂养我会更大哦～`,
      '今天也是元气满满的一天！',
    ],
    normal: [
      `${state.name}正在发呆…`,
      '主人，记得按时喂食我会长得更快',
      '有点无聊，想玩耍了',
    ],
    sad: [
      '肚子好饿…喂食能让我快快长大',
      '好脏，想洗澡了',
      '没精神，想睡觉…',
    ],
    critical: [
      '主人！快来喂我！',
      '再不喂食我就长不大了…',
      '感觉身体被掏空…',
    ],
  };
  const pool = lines[key];
  return pool[Math.floor(Math.random() * pool.length)];
}

function ensureState(pet) {
  let state = readState();
  if (!state) {
    state = createDefaultState(pet);
    pushLog(state, state.photoUrl
      ? `根据照片生成的 ${state.name} 破壳而出！`
      : `欢迎来到数字宠物世界，上传照片即可生成专属形象`);
    writeState(state);
  }
  state = syncProfile(state, pet);
  state = applyDecay(state);
  state = applyPassiveGrowth(state);
  writeState(state);
  return state;
}

function buildView(state) {
  const growthStage = getGrowthStage(state.growthProgress);
  const moodKey = getMoodKey(state);
  const nextExp = expForLevel(state.level);
  const hasPhoto = !!state.photoUrl;
  return {
    ...state,
    hasPhoto,
    stageName: growthStage.name,
    growthStageName: growthStage.name,
    petEmoji: hasPhoto ? '' : growthStage.emoji,
    displayScale: growthStage.scale,
    growthPercent: Math.round(state.growthProgress),
    growthNextStage: GROWTH_STAGES.find((s) => s.min > state.growthProgress) || null,
    feedSummary: `已喂养 ${state.totalFeedCount || 0} 次 · 累计 ${formatFeedDuration(state.totalFeedMinutes)}`,
    moodFace: MOOD_FACE[moodKey],
    moodKey,
    dialogue: getDialogue(state),
    expNeed: nextExp,
    expPercent: Math.round((state.exp / nextExp) * 100),
    isHatching: hasPhoto && state.growthProgress < 5,
    stats: [
      { key: 'hunger', label: '饱食', value: state.hunger, color: '#FF9F43' },
      { key: 'growth', label: '生长', value: Math.round(state.growthProgress), color: '#4CE600' },
      { key: 'mood', label: '心情', value: state.mood, color: '#FF6B9D' },
      { key: 'clean', label: '清洁', value: state.clean, color: '#54A0FF' },
    ],
  };
}

function getState(pet) {
  return buildView(ensureState(pet));
}

function saveAndReturn(state, message) {
  state.lastTick = Date.now();
  writeState(state);
  return { ok: true, message, state: buildView(state) };
}

function useInventory(state, itemId) {
  state.inventory[itemId] = (state.inventory[itemId] || 0) - 1;
  if (state.inventory[itemId] <= 0) delete state.inventory[itemId];
}

function interact(action, pet) {
  const state = ensureState(pet);
  let message = '';

  switch (action) {
    case 'feed': {
      let feedType = 'basic';
      if ((state.inventory.food_premium || 0) > 0) {
        useInventory(state, 'food_premium');
        state.hunger = clamp(state.hunger + 40, 0, 100);
        state.mood = clamp(state.mood + 10, 0, 100);
        feedType = 'premium';
        message = `喂了豪华罐头，${state.name}超满足，体型变大了一点！`;
        addExp(state, 10);
      } else if ((state.inventory.food_basic || 0) > 0) {
        useInventory(state, 'food_basic');
        state.hunger = clamp(state.hunger + 25, 0, 100);
        state.mood = clamp(state.mood + 5, 0, 100);
        message = `喂了口粮，${state.name}吃得津津有味`;
        addExp(state, 6);
      } else if (state.coins >= 10) {
        state.coins -= 10;
        state.hunger = clamp(state.hunger + 20, 0, 100);
        feedType = 'temp';
        message = '买了临时口粮喂食';
        addExp(state, 5);
      } else {
        return { ok: false, message: '口粮不足且金币不够，去商店购买吧' };
      }
      const growth = addFeedGrowth(state, feedType);
      message += `（生长 +${growth.points}%）`;
      break;
    }
    case 'play': {
      if (state.energy < 15) {
        return { ok: false, message: '精力不足，先让宠物休息吧' };
      }
      const hasToy = (state.inventory.toy || 0) > 0;
      if (hasToy) useInventory(state, 'toy');
      state.energy = clamp(state.energy - 15, 0, 100);
      state.mood = clamp(state.mood + (hasToy ? 30 : 20), 0, 100);
      state.hunger = clamp(state.hunger - 5, 0, 100);
      state.passiveGrowthPoints = (state.passiveGrowthPoints || 0) + (hasToy ? 1.5 : 0.8);
      state.growthProgress = calculateGrowth(state);
      checkGrowthStageUp(state);
      message = hasToy ? `用玩具玩耍，${state.name}乐开了花！` : `${state.name}陪你玩了一会儿`;
      addExp(state, 10);
      break;
    }
    case 'bath': {
      if ((state.inventory.bath_ticket || 0) > 0) {
        useInventory(state, 'bath_ticket');
        message = '用了洗澡券，洗香香！';
      } else if (state.coins >= 5) {
        state.coins -= 5;
        message = '搓澡完毕，香喷喷～';
      } else {
        return { ok: false, message: '金币不足，无法洗澡' };
      }
      state.clean = clamp(state.clean + 35, 0, 100);
      state.mood = clamp(state.mood + 8, 0, 100);
      addExp(state, 6);
      break;
    }
    case 'sleep': {
      state.energy = clamp(state.energy + 40, 0, 100);
      state.hunger = clamp(state.hunger - 8, 0, 100);
      message = `${state.name}睡了个好觉，精力恢复！`;
      addExp(state, 4);
      break;
    }
    case 'stroke': {
      state.mood = clamp(state.mood + 12, 0, 100);
      message = `你摸了摸${state.name}的头，它蹭了蹭你`;
      addExp(state, 3);
      break;
    }
    case 'energy_drink': {
      if ((state.inventory.energy_drink || 0) <= 0) {
        return { ok: false, message: '没有精力饮料，去商店购买' };
      }
      useInventory(state, 'energy_drink');
      state.energy = clamp(state.energy + 35, 0, 100);
      message = '喝下精力饮料，瞬间满血！';
      addExp(state, 4);
      break;
    }
    default:
      return { ok: false, message: '未知操作' };
  }

  pushLog(state, message);
  return saveAndReturn(state, message);
}

function generateFromPhoto(photoPath, pet) {
  const state = ensureState(pet);
  if (!photoPath) {
    return { ok: false, message: '请选择宠物照片', state: buildView(state) };
  }
  const isNew = !state.photoUrl;
  state.photoUrl = photoPath;
  state.photoGenerated = true;
  state.photoSyncedAt = Date.now();
  if (isNew || state.growthProgress < 3) {
    state.growthProgress = Math.max(state.growthProgress || 0, 3);
    state.lastGrowthStage = 0;
    checkGrowthStageUp(state);
  }
  const msg = `已根据照片生成「${state.name}」的数字形象！`;
  pushLog(state, msg);
  store.pushMessage('数字宠物生成', msg, 'social');

  if (pet && pet.id) {
    store.updatePet(pet.id, { avatarUrl: photoPath });
  } else {
    const pets = store.listPets();
    if (pets.length) {
      store.updatePet(pets[0].id, { avatarUrl: photoPath });
    } else {
      store.addPet({ name: state.name, species: state.species === 'cat' ? 1 : 2, avatarUrl: photoPath });
    }
  }

  writeState(state);
  return { ok: true, message: msg, state: buildView(state) };
}

function dailyCheckIn(pet) {
  const state = ensureState(pet);
  const today = todayKey();
  if (state.lastCheckIn === today) {
    return { ok: false, message: '今天已经签到过了', state: buildView(state) };
  }
  state.lastCheckIn = today;
  state.totalDays = (state.totalDays || 0) + 1;
  const bonus = 20 + Math.min(state.totalDays, 7) * 5;
  state.coins += bonus;
  state.mood = clamp(state.mood + 5, 0, 100);
  const msg = `签到成功！获得 ${bonus} 金币（连续 ${state.totalDays} 天）`;
  pushLog(state, msg);
  return saveAndReturn(state, msg);
}

function buyItem(itemId, pet) {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) return { ok: false, message: '商品不存在' };
  const state = ensureState(pet);
  if (state.coins < item.price) {
    return { ok: false, message: '金币不足', state: buildView(state) };
  }
  state.coins -= item.price;
  state.inventory[itemId] = (state.inventory[itemId] || 0) + 1;
  const msg = `购买了${item.name}`;
  pushLog(state, msg);
  return saveAndReturn(state, msg);
}

function listShop() {
  return SHOP_ITEMS;
}

function resetPet(pet) {
  const prev = readState();
  const state = createDefaultState(pet);
  const photo = prev?.photoUrl || getPhotoFromPet(pet);
  if (photo) {
    state.photoUrl = photo;
    state.photoGenerated = true;
    state.growthProgress = 3;
  }
  pushLog(state, '数字宠物已重新开始养成');
  writeState(state);
  return buildView(state);
}

module.exports = {
  getState,
  interact,
  dailyCheckIn,
  buyItem,
  listShop,
  resetPet,
  generateFromPhoto,
  GROWTH_STAGES,
};
