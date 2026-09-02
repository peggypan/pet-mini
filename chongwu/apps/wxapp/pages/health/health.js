const api = require('../../utils/request');
const { MOCK_HEALTH } = require('../../utils/mock');
const store = require('../../utils/store');

Page({
  data: {
    pets: [],
    reminders: [],
    activeTab: 'pets',
    notifyEnabled: false,
  },

  onLoad() {
    this.setData({
      notifyEnabled: !!wx.getStorageSync('health_notify_enabled'),
    });
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    await this.loadPets();
    this.loadReminders();
  },

  async loadPets() {
    let pets = store.listPets();
    try {
      const res = await api.get('/health/pets');
      if (res.data?.length) {
        // 合并本地新建宠物
        const apiIds = new Set(res.data.map((p) => String(p.id)));
        const localOnly = pets.filter((p) => !apiIds.has(String(p.id)));
        pets = [...localOnly, ...res.data];
      }
    } catch (e) {
      // local
    }
    if (!pets.length) pets = MOCK_HEALTH.pets.slice();
    this.setData({ pets });
  },

  async loadReminders() {
    let list = [];
    try {
      const res = await api.get('/health/reminders');
      list = res.data || [];
    } catch (e) {
      list = [];
    }

    const fromRecords = store.buildRemindersFromRecords(this.data.pets);
    if (!list.length) {
      list = fromRecords.length ? fromRecords : MOCK_HEALTH.reminders.slice();
    } else {
      list = [...fromRecords, ...list];
    }

    const reminders = list.map((item) => {
      const daysLeft =
        item.daysLeft != null
          ? item.daysLeft
          : this.calculateDaysLeft(item.validUntil);
      return {
        ...item,
        daysLeft,
        urgent: daysLeft <= 7,
      };
    });
    this.setData({ reminders });
  },

  calculateDaysLeft(validUntil) {
    if (!validUntil) return 0;
    return Math.ceil((new Date(validUntil) - new Date()) / (1000 * 60 * 60 * 24));
  },

  onTabTap(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onAddPet() {
    wx.navigateTo({ url: '/pages/pet-form/pet-form' });
  },

  onPetTap(e) {
    wx.navigateTo({
      url: `/pages/health-record/health-record?petId=${e.currentTarget.dataset.id}`,
    });
  },

  onAddRecord(e) {
    wx.navigateTo({
      url: `/pages/health-record/health-record?petId=${e.currentTarget.dataset.petId}&mode=add`,
    });
  },

  onDietRecordTap() {
    wx.navigateTo({ url: '/pages/diet-record/diet-record' });
  },

  onEnableNotify() {
    const enableLocal = () => {
      wx.setStorageSync('health_notify_enabled', 1);
      this.setData({ notifyEnabled: true });
      store.pushMessage('到期提醒已开启', '疫苗/驱虫到期前将在消息中心提示（演示）', 'health');
      wx.showToast({ title: '提醒已开启', icon: 'success' });
    };

    if (typeof wx.requestSubscribeMessage !== 'function') {
      enableLocal();
      return;
    }

    wx.requestSubscribeMessage({
      tmplIds: ['mock_health_remind_tmpl'],
      success: enableLocal,
      fail: () => {
        wx.showModal({
          title: '开启到期提醒',
          content: '正式环境将订阅微信服务通知。演示模式下先本地开启。',
          confirmText: '知道了',
          showCancel: false,
          success: enableLocal,
        });
      },
    });
  },

  onReminderTap(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.reminders.find((r) => r.id === id);
    if (!item) return;
    wx.showModal({
      title: `${item.itemName}提醒`,
      content: `${item.pet.name} · 到期日 ${item.validUntil}（还剩 ${item.daysLeft} 天）`,
      confirmText: '去记录',
      success: (res) => {
        if (res.confirm) {
          const pet = this.data.pets[0];
          wx.navigateTo({
            url: `/pages/health-record/health-record?petId=${pet ? pet.id : ''}&mode=add`,
          });
        }
      },
    });
  },
});
