const store = require('../../utils/store');

Page({
  data: {
    threadId: '',
    peer: {},
    status: 'calling',
    duration: 0,
    durationText: '00:00',
    muted: false,
    cameraFront: true,
  },

  _timer: null,

  onLoad(options) {
    this.setData({
      threadId: options.threadId || '',
      peer: {
        id: options.peerId,
        userName: decodeURIComponent(options.peerName || '宠友'),
        petName: decodeURIComponent(options.petName || ''),
        avatar: decodeURIComponent(options.avatar || '/assets/mock/real_avatar.jpg'),
      },
    });
    setTimeout(() => {
      if (this.data.status === 'calling') {
        this.setData({ status: 'connected' });
        this.startTimer();
      }
    }, 2200);
  },

  onUnload() {
    this.clearTimer();
  },

  startTimer() {
    this.clearTimer();
    this._timer = setInterval(() => {
      const duration = this.data.duration + 1;
      this.setData({ duration, durationText: this.formatDuration(duration) });
    }, 1000);
  },

  clearTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  },

  formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  },

  onToggleMute() {
    this.setData({ muted: !this.data.muted });
    wx.showToast({ title: this.data.muted ? '已静音' : '已取消静音', icon: 'none' });
  },

  onToggleCamera() {
    this.setData({ cameraFront: !this.data.cameraFront });
    wx.showToast({ title: '切换摄像头（演示）', icon: 'none' });
  },

  onHangup() {
    this.clearTimer();
    const { threadId, duration, status } = this.data;
    if (threadId) {
      store.addChatMessage(threadId, {
        from: 'me',
        type: 'call',
        callStatus: status === 'connected' ? 'ended' : 'missed',
        duration: status === 'connected' ? duration : 0,
        content: status === 'connected' ? `视频通话 ${duration} 秒` : '未接视频通话',
      });
    }
    wx.navigateBack();
  },
});
