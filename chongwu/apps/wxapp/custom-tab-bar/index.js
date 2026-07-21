Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        icon: "🏠"
      },
      {
        pagePath: "/pages/service/service",
        icon: "▦"
      },
      {
        pagePath: "/pages/idle/idle",
        icon: "⇄"
      },
      {
        pagePath: "/pages/profile/profile",
        icon: "👤"
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      wx.switchTab({ url });
    }
  }
});
