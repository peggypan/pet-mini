const cloudApi = require('./cloud-api');
const store = require('./store');

function ledgerApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('points_ledger', action, payload);
}

async function refreshPointsFromCloud() {
  if (!cloudApi.cloudEnabled()) {
    return {
      balance: store.getUserPointsBalance(),
      logs: store.getUserPointsRow().logs,
    };
  }
  try {
    const data = await ledgerApi('getSummary', { limit: 50 });
    store.applyPointsFromCloud(data);
    return {
      balance: data.balance != null ? data.balance : store.getUserPointsBalance(),
      logs: store.getUserPointsRow().logs,
    };
  } catch (e) {
    console.warn('[points-ledger-cloud-sync] getSummary', e);
    return {
      balance: store.getUserPointsBalance(),
      logs: store.getUserPointsRow().logs,
    };
  }
}

module.exports = {
  refreshPointsFromCloud,
};
