const { EMOJI_TABS, getEmojiList } = require('../../utils/pet-emoji');
const {
  ensureRecordReady,
  isPrivacyScopeError,
  showRecordPrivacyGuide,
} = require('../../utils/record-auth');

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
      this._cancelVoice = false;
      this.recorder = wx.getRecorderManager();
      this.recorder.onStop((res) => {
        this.setData({ recording: false });
        if (this._cancelVoice) {
          this._cancelVoice = false;
          return;
        }
        if (!res.tempFilePath || (res.duration || 0) < 500) {
          wx.showToast({ title: '说话时间太短', icon: 'none' });
          return;
        }
        this.triggerEvent('voice', {
          filePath: res.tempFilePath,
          duration: Math.max(1, Math.round((res.duration || 0) / 1000)),
        });
      });
      this.recorder.onError((err) => {
        this.setData({ recording: false });
        this._cancelVoice = false;
        if (isPrivacyScopeError(err)) {
          showRecordPrivacyGuide();
          return;
        }
        const msg = (err && err.errMsg) || '';
        if (msg.includes('auth') || msg.includes('authorize')) {
          wx.showToast({ title: '请授权麦克风后重试', icon: 'none' });
          return;
        }
        wx.showToast({ title: '录音失败，请重试', icon: 'none' });
      });
      this.recorder.onStart(() => {
        this._cancelVoice = false;
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
      if (this.data.recording) return;
      ensureRecordReady()
        .then(() => this.startRecord())
        .catch(() => {});
    },

    startRecord() {
      if (this.data.recording) return;
      this.setData({ recording: true });
      try {
        this.recorder.start({
          format: 'mp3',
          duration: 60000,
          sampleRate: 16000,
          encodeBitRate: 48000,
          numberOfChannels: 1,
        });
      } catch (e) {
        this.setData({ recording: false });
        wx.showToast({ title: '无法启动录音', icon: 'none' });
      }
    },

    onVoiceEnd() {
      if (!this.data.recording) return;
      this.recorder.stop();
    },

    onVoiceCancel() {
      if (!this.data.recording) return;
      this._cancelVoice = true;
      this.recorder.stop();
    },

    noop() {},
  },
});
