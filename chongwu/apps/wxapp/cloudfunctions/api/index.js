const cloud = require('wx-server-sdk');
const { route } = require('./router');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event) => {
  return route(event || {});
};
