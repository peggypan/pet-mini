Component({
  data: {
    selected: 0,
    color: "#B2BEC3",
    selectedColor: "#FF8B7B",
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        icon: "🏠",
        iconActive: "🏡"
      },
      {
        pagePath: "/pages/service/service",
        text: "服务",
        icon: "💝",
        iconActive: "💖"
      },
      {
        pagePath: "/pages/idle/idle",
        text: "闲置",
        icon: "🎁",
        iconActive: "🎀"
      },
      {
        pagePath: "/pages/profile/profile",
        text: "我的",
        icon: "💕",
        iconActive: "💖"
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({ url })
    }
  }
})
