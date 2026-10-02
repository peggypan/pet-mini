const store = require('../../utils/store');
const { deleteOwnedEvent } = require('../../utils/user-content-delete');
const amap = require('../../utils/amap');

const AUDIT_TEXT = {
  pending: '已上线',
  approved: '已上线',
  rejected: '未通过',
};

const ROLE_TEXT = {
  personal: '个人',
  merchant: '商家',
};

Page({
  data: {
    created: [],
    joined: [],
    auditText: AUDIT_TEXT,
    roleText: ROLE_TEXT,
  },

  onShow() {
    this.setData({
      created: store.listMyEvents(),
      joined: store.listEventSignups(),
    });
  },

  async onDeleteCreated(e) {
    const { id } = e.currentTarget.dataset;
    const res = await deleteOwnedEvent(id);
    if (!res.ok) {
      if (res.reason && !res.cancelled) wx.showToast({ title: res.reason, icon: 'none' });
      return;
    }
    this.onShow();
  },

  onOpenPlace(e) {
    amap.openPlaceFromTap(e);
  },

  onOpenTicket(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${id}&ticket=1` });
  },
});
