const store = require('./store');
const { RISK_TIPS } = require('./mock');
const { requirePetProfile } = require('./pet-profile-guard');

function startBuddyChat(buddy) {
  if (!buddy) return;
  if (!requirePetProfile()) return;
  wx.showModal({
    title: '线下见面提示',
    content: RISK_TIPS.meet,
    confirmText: '发起私聊',
    success: (res) => {
      if (!res.confirm) return;
      store.ensureChatThread({
        id: `c_${buddy.id}`,
        peerId: buddy.id,
        peerName: buddy.userName,
        petName: buddy.petName,
        avatar: buddy.avatar || buddy.cover,
      });
      const shareTitle = encodeURIComponent(
        `${buddy.userName} · ${buddy.petName} · ${buddy.buddyType || '搭子'}`,
      );
      const shareText = encodeURIComponent((buddy.desc || '').slice(0, 160));
      wx.navigateTo({
        url: `/pages/chat/chat?peerId=${buddy.id}&shareComment=1&shareTitle=${shareTitle}&shareText=${shareText}&shareRef=${buddy.id}`,
      });
    },
  });
}

module.exports = { startBuddyChat };
