const store = require('../../utils/store');

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
});
