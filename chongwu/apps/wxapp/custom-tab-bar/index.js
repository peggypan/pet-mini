Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        icon: "/assets/icons/tab-home.png",
        iconActive: "/assets/icons/tab-home-active.png"
      },
      {
        pagePath: "/pages/service/service",
        icon: "/assets/icons/tab-service.png",
        iconActive: "/assets/icons/tab-service-active.png"
      },
      {
        pagePath: "/pages/idle/idle",
        icon: "/assets/icons/tab-idle.png",
        iconActive: "/assets/icons/tab-idle-active.png"
      },
      {
        pagePath: "/pages/profile/profile",
        icon: "/assets/icons/tab-profile.png",
        iconActive: "/assets/icons/tab-profile-active.png"
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
