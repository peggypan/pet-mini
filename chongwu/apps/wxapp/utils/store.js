/**
 * MVP 本地数据层：无后端时可走通主路径；后端就绪后可逐步切换为 API。
 * Storage keys 集中管理，便于后续迁移。
 */

const KEYS = {
  serviceOrders: 'mvp_service_orders',
  idleOrdersBuy: 'mvp_idle_orders_buy',
  idleOrdersSell: 'mvp_idle_orders_sell',
  idleItems: 'mvp_idle_items',
  healthPets: 'mvp_health_pets',
  healthRecords: 'mvp_health_records',
  socialPosts: 'mvp_social_posts',
  eventSignups: 'mvp_event_signups',
  mallGoodsOrders: 'mvp_mall_goods_orders',
  mallServiceOrders: 'mall_service_orders',
  messages: 'mvp_messages',
  addressBook: 'mvp_address_book',
};

function read(key, fallback) {
  try {
    const val = wx.getStorageSync(key);
    return val === '' || val === undefined || val === null ? fallback : val;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  wx.setStorageSync(key, value);
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function orderNo(prefix) {
  const d = new Date();
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${prefix}${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${String(d.getSeconds()).padStart(2, '0')}`;
}

function pushMessage(title, content, type) {
  const list = read(KEYS.messages, []);
  list.unshift({
    id: uid('msg'),
    title,
    content,
    type: type || 'system',
    read: false,
    createdAt: new Date().toISOString(),
  });
  write(KEYS.messages, list.slice(0, 50));
}

/** —— 服务订单 —— */
function listServiceOrders() {
  return read(KEYS.serviceOrders, []);
}

function addServiceOrder(payload) {
  const list = listServiceOrders();
  const order = {
    id: uid('so'),
    orderNo: orderNo('S'),
    status: 1,
    statusText: '已预约',
    payAmount: payload.payAmount,
    serviceName: payload.serviceName,
    appointmentDate: payload.appointmentDate || '',
    appointmentTime: payload.appointmentTime || '',
    contactName: payload.contactName,
    contactPhone: payload.contactPhone,
    addressText: payload.addressText || '',
    remark: payload.remark || '',
    createdAt: new Date().toISOString(),
    service: {
      id: payload.serviceId,
      coverUrls: payload.coverUrls || [],
      name: payload.serviceName,
    },
    merchant: {
      name: payload.merchantName || '服务商',
    },
  };
  list.unshift(order);
  write(KEYS.serviceOrders, list.slice(0, 50));
  pushMessage('服务预约成功', `已预约「${order.serviceName}」，订单号 ${order.orderNo}`, 'order');
  return order;
}

/** —— 闲置 —— */
function listLocalIdleItems() {
  return read(KEYS.idleItems, []);
}

function addIdleItem(item) {
  const list = listLocalIdleItems();
  const row = {
    id: uid('idle'),
    ...item,
    createdAt: new Date().toISOString(),
    seller: item.seller || { nickname: '我' },
  };
  list.unshift(row);
  write(KEYS.idleItems, list.slice(0, 50));
  return row;
}

function findLocalIdleItem(id) {
  return listLocalIdleItems().find((x) => String(x.id) === String(id));
}

function listIdleBuyOrders() {
  return read(KEYS.idleOrdersBuy, []);
}

function listIdleSellOrders() {
  return read(KEYS.idleOrdersSell, []);
}

function addIdleBuyOrder(payload) {
  const buy = listIdleBuyOrders();
  const order = {
    id: uid('io'),
    orderNo: orderNo('I'),
    status: 1,
    statusText: '已下单',
    payAmount: payload.payAmount,
    itemTitle: payload.itemTitle,
    deliveryType: payload.deliveryType,
    address: payload.address || '',
    createdAt: new Date().toISOString(),
    idleItem: {
      id: payload.itemId,
      images: payload.images || [],
      title: payload.itemTitle,
    },
    seller: payload.seller || { nickname: '卖家' },
  };
  buy.unshift(order);
  write(KEYS.idleOrdersBuy, buy.slice(0, 50));
  pushMessage('闲置下单成功', `已下单「${order.itemTitle}」，订单号 ${order.orderNo}`, 'order');
  return order;
}

/** —— 健康 —— */
function listPets() {
  return read(KEYS.healthPets, []);
}

function savePets(pets) {
  write(KEYS.healthPets, pets);
}

function getPet(id) {
  return listPets().find((p) => String(p.id) === String(id));
}

function addPet(pet) {
  const pets = listPets();
  const row = {
    id: uid('pet'),
    avatarUrl: '/assets/mock/real_avatar.jpg',
    ...pet,
    createdAt: new Date().toISOString(),
  };
  pets.unshift(row);
  savePets(pets);
  pushMessage('宠物档案已创建', `已添加「${row.name}」到健康本`, 'health');
  return row;
}

function updatePet(id, patch) {
  const pets = listPets().map((p) => (String(p.id) === String(id) ? { ...p, ...patch } : p));
  savePets(pets);
  return getPet(id);
}

function listRecords(petId) {
  const all = read(KEYS.healthRecords, {});
  return all[petId] || [];
}

function addRecord(petId, record) {
  const all = read(KEYS.healthRecords, {});
  const list = all[petId] || [];
  const row = {
    id: uid('hr'),
    ...record,
    createdAt: new Date().toISOString(),
  };
  list.unshift(row);
  all[petId] = list.slice(0, 100);
  write(KEYS.healthRecords, all);
  if (record.validUntil) {
    pushMessage('健康提醒已更新', `${record.itemName || '项目'} 有效期至 ${record.validUntil}`, 'health');
  }
  return row;
}

function buildRemindersFromRecords(pets) {
  const now = Date.now();
  const reminders = [];
  (pets || []).forEach((pet) => {
    listRecords(pet.id).forEach((r) => {
      if (!r.validUntil) return;
      const daysLeft = Math.ceil((new Date(r.validUntil).getTime() - now) / 86400000);
      if (daysLeft < 0 || daysLeft > 60) return;
      reminders.push({
        id: `rem_${r.id}`,
        itemName: r.itemName || '健康项目',
        validUntil: r.validUntil,
        daysLeft,
        urgent: daysLeft <= 7,
        notifyOn: true,
        pet: { name: pet.name, avatarUrl: pet.avatarUrl },
      });
    });
  });
  return reminders.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** —— 社区 —— */
function listSocialPosts() {
  return read(KEYS.socialPosts, []);
}

function addSocialPost(post) {
  const list = listSocialPosts();
  const row = {
    id: uid('post'),
    time: '刚刚',
    likes: 0,
    comments: 0,
    shares: 0,
    liked: false,
    essence: false,
    ...post,
  };
  list.unshift(row);
  write(KEYS.socialPosts, list.slice(0, 50));
  return row;
}

function getSocialPost(id) {
  return listSocialPosts().find((p) => String(p.id) === String(id)) || null;
}

function updateSocialPost(id, patch) {
  const list = listSocialPosts();
  let found = false;
  const next = list.map((p) => {
    if (String(p.id) !== String(id)) return p;
    found = true;
    return { ...p, ...patch };
  });
  if (found) {
    write(KEYS.socialPosts, next);
    return next.find((p) => String(p.id) === String(id));
  }
  // Mock 帖：写入本地覆盖表
  const overrides = read('mvp_social_overrides', {});
  overrides[id] = { ...(overrides[id] || {}), ...patch, id };
  write('mvp_social_overrides', overrides);
  return overrides[id];
}

function getSocialOverride(id) {
  const overrides = read('mvp_social_overrides', {});
  return overrides[id] || null;
}

function listPostComments(postId) {
  const all = read('mvp_post_comments', {});
  return all[postId] || [];
}

function addPostComment(postId, comment) {
  const all = read('mvp_post_comments', {});
  const list = all[postId] || [];
  const row = {
    id: uid('cmt'),
    userName: comment.userName || '我',
    avatar: comment.avatar || '/assets/mock/real_avatar.jpg',
    content: comment.content,
    time: '刚刚',
    createdAt: new Date().toISOString(),
  };
  list.unshift(row);
  all[postId] = list.slice(0, 100);
  write('mvp_post_comments', all);
  return row;
}

function listEventSignups() {
  return read(KEYS.eventSignups, []);
}

function addEventSignup(event) {
  const list = listEventSignups();
  if (list.some((x) => String(x.eventId) === String(event.id))) {
    return { duplicated: true, list };
  }
  list.unshift({
    id: uid('ev'),
    eventId: event.id,
    title: event.title,
    place: event.place,
    fee: event.fee,
    createdAt: new Date().toISOString(),
  });
  write(KEYS.eventSignups, list);
  pushMessage('活动报名成功', `已报名「${event.title}」`, 'social');
  return { duplicated: false, list };
}

/** —— 商城 —— */
function listMallGoodsOrders() {
  return read(KEYS.mallGoodsOrders, []);
}

function addMallGoodsOrder(payload) {
  const list = listMallGoodsOrders();
  const order = {
    id: uid('mg'),
    orderNo: orderNo('M'),
    status: 1,
    statusText: '待发货',
    payAmount: payload.payAmount,
    productName: payload.productName,
    createdAt: new Date().toISOString(),
    cover: payload.cover || '',
    contactName: payload.contactName || '',
    contactPhone: payload.contactPhone || '',
    address: payload.address || '',
    remark: payload.remark || '',
  };
  list.unshift(order);
  write(KEYS.mallGoodsOrders, list.slice(0, 50));
  pushMessage('商城下单成功', `已购买「${order.productName}」`, 'order');
  return order;
}

function listMallServiceOrders() {
  return read(KEYS.mallServiceOrders, []);
}

function listMessages() {
  return read(KEYS.messages, []);
}

function markMessagesRead() {
  const list = listMessages().map((m) => ({ ...m, read: true }));
  write(KEYS.messages, list);
  return list;
}

function countUnreadMessages() {
  return listMessages().filter((m) => !m.read).length;
}

/** —— 地址簿 —— */
function listAddresses() {
  return read(KEYS.addressBook, []);
}

function addAddress(address) {
  const list = listAddresses();
  const addr = {
    id: uid('addr'),
    ...address,
    isDefault: list.length === 0, // 第一个地址设为默认
    createdAt: new Date().toISOString(),
  };
  list.unshift(addr);
  write(KEYS.addressBook, list);
  return addr;
}

function updateAddress(id, patch) {
  const list = listAddresses();
  const index = list.findIndex((a) => String(a.id) === String(id));
  if (index === -1) return null;

  // 如果设置为默认地址，需要先取消其他默认地址
  if (patch.isDefault) {
    list.forEach((a, i) => {
      if (i !== index) list[i].isDefault = false;
    });
  }

  list[index] = { ...list[index], ...patch };
  write(KEYS.addressBook, list);
  return list[index];
}

function deleteAddress(id) {
  const list = listAddresses();
  const filtered = list.filter((a) => String(a.id) !== String(id));

  // 如果删除的是默认地址，把第一个设为默认
  if (filtered.length > 0) {
    const deletedWasDefault = list.find((a) => String(a.id) === String(id))?.isDefault;
    if (deletedWasDefault && !filtered.some((a) => a.isDefault)) {
      filtered[0].isDefault = true;
    }
  }

  write(KEYS.addressBook, filtered);
  return filtered;
}

function getDefaultAddress() {
  const list = listAddresses();
  return list.find((a) => a.isDefault) || (list[0] || null);
}

module.exports = {
  KEYS,
  read,
  write,
  uid,
  listServiceOrders,
  addServiceOrder,
  listLocalIdleItems,
  addIdleItem,
  findLocalIdleItem,
  listIdleBuyOrders,
  listIdleSellOrders,
  addIdleBuyOrder,
  listPets,
  getPet,
  addPet,
  updatePet,
  listRecords,
  addRecord,
  buildRemindersFromRecords,
  listSocialPosts,
  addSocialPost,
  getSocialPost,
  updateSocialPost,
  getSocialOverride,
  listPostComments,
  addPostComment,
  listEventSignups,
  addEventSignup,
  listMallGoodsOrders,
  addMallGoodsOrder,
  listMallServiceOrders,
  listMessages,
  markMessagesRead,
  countUnreadMessages,
  pushMessage,
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getDefaultAddress,
};
