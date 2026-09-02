Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/social/social', emoji: '🏡', label: '广场' },
      { pagePath: '/pages/discover/discover', emoji: '🐾', label: '发现' },
      { pagePath: '/pages/messages/messages', emoji: '💬', label: '消息' },
      { pagePath: '/pages/profile/profile', emoji: '☺', label: '我的' },
    ],
  },
  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      wx.switchTab({ url: path });
      this.setData({ selected: index });
    },
  },
});
