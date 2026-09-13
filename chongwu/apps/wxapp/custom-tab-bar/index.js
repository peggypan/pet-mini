const { openEventPublishEntry } = require('../utils/event-publish-nav');

Component({
  data: {
    selected: 0,
    showQuickNav: false,
    leftTabs: [],
    rightTabs: [],
    centerTab: null,
    list: [
      {
        pagePath: '/pages/home/home',
        icon: '/assets/icons/tab-home.png',
        iconActive: '/assets/icons/tab-home-active.png',
        label: '首页',
      },
      {
        pagePath: '/pages/events/events',
        emoji: '🎾',
        label: '活动',
      },
      { pagePath: '/pages/social/social', label: '宠友圈', center: true },
      {
        pagePath: '/pages/messages/messages',
        emoji: '💬',
        label: '消息',
      },
      {
        pagePath: '/pages/profile/profile',
        icon: '/assets/icons/tab-profile.png',
        iconActive: '/assets/icons/tab-profile-active.png',
        label: '我的',
      },
    ],
    quickCards: {
      buddy: { id: 'buddy', type: 'page', path: '/pages/buddy/buddy' },
      social: { id: 'social', type: 'tab', path: '/pages/social/social' },
      event: { id: 'event', type: 'page', path: '/pages/event-publish/event-publish' },
    },
  },

  lifetimes: {
    attached() {
      this.syncSideTabs();
    },
  },

  methods: {
    syncSideTabs() {
      const list = this.data.list;
      const centerIndex = list.findIndex((item) => item.center);
      const centerTab = centerIndex >= 0 ? { ...list[centerIndex], tabIndex: centerIndex } : null;
      const leftTabs = list
        .slice(0, centerIndex)
        .map((item, i) => ({ ...item, tabIndex: i }));
      const rightTabs = list
        .slice(centerIndex + 1)
        .map((item, i) => ({ ...item, tabIndex: centerIndex + 1 + i }));
      this.setData({ leftTabs, rightTabs, centerTab });
    },

    switchTab(e) {
      const { path, index, center } = e.currentTarget.dataset;
      if (center) {
        this.setData({ showQuickNav: !this.data.showQuickNav });
        return;
      }
      this.setData({ showQuickNav: false });
      wx.switchTab({ url: path });
      this.setData({ selected: index });
    },

    closeQuickNav() {
      this.setData({ showQuickNav: false });
    },

    onQuickAction(e) {
      const id = e.currentTarget.dataset.action;
      const action = this.data.quickCards[id];
      if (!action) return;
      this.setData({ showQuickNav: false });
      if (action.type === 'tab') {
        const tabIndex = this.data.list.findIndex((t) => t.pagePath === action.path);
        wx.switchTab({ url: action.path });
        if (tabIndex >= 0) this.setData({ selected: tabIndex });
        return;
      }
      if (action.id === 'event') {
        openEventPublishEntry();
        return;
      }
      wx.navigateTo({ url: action.path });
    },
  },
});
