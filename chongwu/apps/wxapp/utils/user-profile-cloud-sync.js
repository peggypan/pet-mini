const {
  persistUserProfileFields,
  pullUserProfileFromCloud,
} = require('./persist-user-profile');

async function saveUserProfileToCloud(fields) {
  return persistUserProfileFields(fields || {});
}

async function saveNicknameToCloud(nickname) {
  return persistUserProfileFields({ nickname });
}

async function refreshUserProfileFromCloud() {
  return pullUserProfileFromCloud();
}

module.exports = {
  saveUserProfileToCloud,
  saveNicknameToCloud,
  refreshUserProfileFromCloud,
};
