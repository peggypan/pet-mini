const store = require('./store');
const cloudApi = require('./cloud-api');
const { ensureChatThreadOnCloud } = require('./chat-cloud-sync');
const { RISK_TIPS } = require('./mock');
const { requireInteract } = require('./pet-profile-guard');

function startBuddyChat(buddy) {
  if (!buddy) return;
  if (!requireInteract()) return;
  wx.showModal({
    title: '线下见面提示',
    content: RISK_TIPS.meet,
    confirmText: '发起私聊',
    success: async (res) => {
      if (!res.confirm) return;
      const peerOpenid = buddy.openid || buddy._openid || '';
      const peerId = peerOpenid || buddy.id;
      const threadPayload = {
        id: `c_${peerId}`,
        peerId,
        peerOpenid,
        peerName: buddy.userName,
        petName: buddy.petName,
        avatar: buddy.avatar || buddy.cover,
      };
      if (cloudApi.cloudEnabled()) {
        await ensureChatThreadOnCloud(threadPayload);
      } else {
        store.ensureChatThread(threadPayload);
      }
      const shareTitle = encodeURIComponent(
        `${buddy.userName} · ${buddy.petName} · ${buddy.buddyType || '搭子'}`,
      );
      const shareText = encodeURIComponent((buddy.desc || '').slice(0, 160));
      const avatar = encodeURIComponent(buddy.avatar || buddy.cover || '');
      const peerName = encodeURIComponent(buddy.userName || '');
      const petName = encodeURIComponent(buddy.petName || '');
      wx.navigateTo({
        url: `/pages/chat/chat?peerId=${peerId}&peerName=${peerName}&petName=${petName}&avatar=${avatar}&shareComment=1&shareTitle=${shareTitle}&shareText=${shareText}&shareRef=${buddy.id}`,
      });
    },
  });
}

module.exports = { startBuddyChat };
