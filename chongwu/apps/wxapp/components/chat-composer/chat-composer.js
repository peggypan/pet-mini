const { EMOJI_TABS, getEmojiList } = require('../../utils/pet-emoji');

Component({
  properties: {
    value: { type: String, value: '' },
    placeholder: { type: String, value: '说点什么…' },
    fixed: { type: Boolean, value: true },
    showVideo: { type: Boolean, value: true },
    showActivity: { type: Boolean, value: true },
    showEmojiPanel: { type: Boolean, value: true },
  },

  data: {
    showTools: false,
    showEmoji: false,
    voiceMode: false,
    recording: false,
    emojiTabs: EMOJI_TABS,
    emojiTab: 'cat',
    emojiList: getEmojiList('cat'),
  },

  lifetimes: {
    attached() {
      this.recorder = wx.getRecorderManager();
      this.recorder.onStop((res) => {
        this.setData({ recording: false });
        if (!res.tempFilePath || (res.duration || 0) < 500) {
          wx.showToast({ title: '说话时间太短', icon: 'none' });
          return;
        }
        this.triggerEvent('voice', {
          filePath: res.tempFilePath,
          duration: Math.round((res.duration || 0) / 1000),
        });
      });
      this.recorder.onError(() => {
        this.setData({ recording: false });
        wx.showToast({ title: '录音失败', icon: 'none' });
      });
    },
  },

  methods: {
    emitPanelChange() {
      this.triggerEvent('panelchange', {
        showTools: this.data.showTools,
        showEmoji: this.data.showEmoji,
        voiceMode: this.data.voiceMode,
      });
    },

    closePanels() {
      this.setData({ showTools: false, showEmoji: false });
      this.emitPanelChange();
    },

    onInput(e) {
      this.triggerEvent('input', { value: e.detail.value });
    },

    onInputFocus() {
      this.setData({ showTools: false, showEmoji: false });
      this.emitPanelChange();
    },

    onSend() {
      this.triggerEvent('send', { value: (this.properties.value || '').trim() });
    },

    onToggleVoice() {
      const voiceMode = !this.data.voiceMode;
      this.setData({ voiceMode, showTools: false, showEmoji: false });
      this.emitPanelChange();
    },

    onToggleTools() {
      const showTools = !this.data.showTools;
      this.setData({ showTools, showEmoji: false, voiceMode: false });
      this.emitPanelChange();
    },

    onToggleEmoji() {
      const showEmoji = !this.data.showEmoji;
      this.setData({
        showEmoji,
        showTools: false,
        voiceMode: false,
        emojiList: getEmojiList(this.data.emojiTab),
      });
      this.emitPanelChange();
    },

    onEmojiTab(e) {
      const tab = e.currentTarget.dataset.tab;
      this.setData({ emojiTab: tab, emojiList: getEmojiList(tab) });
    },

    onPickEmoji(e) {
      const emoji = e.currentTarget.dataset.emoji || '';
      if (!emoji) return;
      const next = `${this.properties.value || ''}${emoji}`;
      this.triggerEvent('input', { value: next });
    },

    onTool(e) {
      const action = e.currentTarget.dataset.action;
      this.setData({ showTools: false });
      this.emitPanelChange();
      this.triggerEvent('tool', { action });
    },

    onVoiceStart() {
      wx.authorize({
        scope: 'scope.record',
        success: () => this.startRecord(),
        fail: () => {
          wx.showModal({
            title: '需要麦克风权限',
            content: '发送语音需要授权麦克风',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting();
            },
          });
        },
      });
    },

    startRecord() {
      this.setData({ recording: true });
      this.recorder.start({
        format: 'mp3',
        duration: 60000,
        sampleRate: 44100,
        numberOfChannels: 1,
      });
    },

    onVoiceEnd() {
      if (!this.data.recording) return;
      this.recorder.stop();
    },

    onVoiceCancel() {
      if (!this.data.recording) return;
      this.recorder.stop();
      this.setData({ recording: false });
    },
  },
});
