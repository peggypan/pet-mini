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
    showLocation: { type: Boolean, value: true },
    showAa: { type: Boolean, value: true },
    showEmojiPanel: { type: Boolean, value: true },
  },

  data: {
    showTools: false,
    showEmoji: false,
    voiceMode: false,
    recording: false,
    recordSeconds: 0,
    cancelArmed: false,
    emojiTabs: EMOJI_TABS,
    emojiTab: 'cat',
    emojiList: getEmojiList('cat'),
  },

  lifetimes: {
    attached() {
      this._cancelVoice = false;
      this.recorder = wx.getRecorderManager();
      this.recorder.onStop((res) => {
        this.clearRecordTimer();
        this.setData({ recording: false, recordSeconds: 0, cancelArmed: false });
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
        this.clearRecordTimer();
        this.setData({ recording: false, recordSeconds: 0 });
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

    detached() {
      this.clearRecordTimer();
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

    onVoiceStart(e) {
      if (this.data.recording) return;
      this._startY = (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
      this.setData({ cancelArmed: false });
      ensureRecordReady()
        .then(() => this.startRecord())
        .catch(() => {});
    },

    onVoiceMove(e) {
      if (!this.data.recording) return;
      const y = (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
      const slideUp = this._startY - y;
      const armed = slideUp > 80;
      if (armed !== this.data.cancelArmed) this.setData({ cancelArmed: armed });
    },

    onVoiceEnd() {
      if (!this.data.recording) return;
      if (this.data.cancelArmed) {
        this.onVoiceCancel();
        return;
      }
      this.recorder.stop();
    },

    onVoiceCancel() {
      if (!this.data.recording) return;
      this._cancelVoice = true;
      this.setData({ cancelArmed: false });
      this.recorder.stop();
    },

    startRecord() {
      if (this.data.recording) return;
      this.setData({ recording: true, recordSeconds: 0 });
      this.startRecordTimer();
      try {
        this.recorder.start({
          format: 'mp3',
          duration: 60000,
          sampleRate: 16000,
          encodeBitRate: 48000,
          numberOfChannels: 1,
        });
      } catch (e) {
        this.clearRecordTimer();
        this.setData({ recording: false, recordSeconds: 0 });
        wx.showToast({ title: '无法启动录音', icon: 'none' });
      }
    },

    startRecordTimer() {
      this.clearRecordTimer();
      this._vibrated = false;
      this._recordTimer = setInterval(() => {
        const next = this.data.recordSeconds + 1;
        if (next >= 60) {
          this.clearRecordTimer();
          if (this.data.recording) this.recorder.stop();
          return;
        }
        // 剩余 10 秒时震动提醒一次
        if (next === 50 && !this._vibrated) {
          this._vibrated = true;
          wx.vibrateShort({ type: 'medium' });
        }
        this.setData({ recordSeconds: next });
      }, 1000);
    },

    clearRecordTimer() {
      if (this._recordTimer) {
        clearInterval(this._recordTimer);
        this._recordTimer = null;
      }
    },

    noop() {},
  },
});
