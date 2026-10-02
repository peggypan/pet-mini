const cloudApi = require('./cloud-api');
const sensitiveWords = require('./sensitive-words');

function wordsApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('sensitive_words', action, payload);
}

async function refreshSensitiveWordsFromCloud() {
  if (!cloudApi.cloudEnabled()) {
    return sensitiveWords.getSensitiveWords();
  }
  try {
    const data = await wordsApi('listActive');
    const list = (data && data.list) || [];
    return sensitiveWords.replaceFromCloud(list);
  } catch (e) {
    console.warn('[sensitive-words-cloud-sync] listActive', e);
    return sensitiveWords.getSensitiveWords();
  }
}

module.exports = {
  refreshSensitiveWordsFromCloud,
};
