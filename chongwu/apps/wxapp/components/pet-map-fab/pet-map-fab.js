const { PET_FAB_ITEMS, getPetFabLabel } = require('../../utils/map-pet-filter');

Component({
  properties: {
    value: { type: String, value: '' },
    expanded: { type: Boolean, value: false },
    /** up：菜单向上展开（全屏地图）；down：向下展开（地图预览区避免顶栏裁切） */
    expand: { type: String, value: 'up' },
  },

  data: {
    items: PET_FAB_ITEMS,
    triggerText: '筛选',
    triggerEmoji: '🐾',
  },

  observers: {
    value(v) {
      const item = PET_FAB_ITEMS.find((i) => i.id === v);
      this.setData({
        triggerText: getPetFabLabel(v),
        triggerEmoji: item ? item.emoji : '🐾',
      });
    },
  },

  methods: {
    onToggle() {
      this.triggerEvent('toggle');
    },

    onPick(e) {
      const id = e.currentTarget.dataset.id;
      this.triggerEvent('change', { value: id || '' });
    },
  },
});
