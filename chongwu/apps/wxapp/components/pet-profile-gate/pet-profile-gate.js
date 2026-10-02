const { PET_FORM_PATH } = require('../../utils/pet-profile-guard');

Component({
  properties: {
    show: { type: Boolean, value: false },
  },

  methods: {
    noop() {},

    onGoForm() {
      wx.navigateTo({ url: PET_FORM_PATH });
    },

    onGoHome() {
      wx.switchTab({ url: '/pages/home/home' });
    },
  },
});
