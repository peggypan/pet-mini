const store = require('./store');

/** 当前登录用户是否为该活动发起人 */
function isEventOrganizer(event) {
  if (!event) return false;
  if (event.isMine === true) return true;
  return !!store.getMyEvent(event.id);
}

module.exports = {
  isEventOrganizer,
};
