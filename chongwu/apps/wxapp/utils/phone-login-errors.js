/** getPhoneNumber 失败说明（多为公众平台未开通能力，非前端 bug） */

function explainGetPhoneNumberFail(detail = {}) {
  const errMsg = String(detail.errMsg || '');
  const errno = Number(detail.errno);

  if (errMsg.includes('no permission')) {
    return {
      title: '未开通手机号快速验证',
      content:
        `微信返回：${errMsg}\n\n` +
        '表示当前 AppID 在平台侧没有调用权限，需在 mp.weixin.qq.com 配置：\n' +
        '① 小程序已微信认证，且主体非「个人」\n' +
        '② 设置 → 用户隐私保护指引 → 勾选并发布「手机号」\n' +
        '③ 开发管理 → 接口设置 → 开启「手机号快速验证组件」\n' +
        '④ 付费管理 → 仍有 1000 次体验额度或已购资源包\n\n' +
        '配置生效后需重新上传/体验版再测。开发阶段可用下方「微信快捷登录」。',
      suggestWxLogin: true,
    };
  }

  if (errno === 1400001 || errMsg.includes('quota')) {
    return {
      title: '手机号验证次数已用尽',
      content:
        `微信返回：${errMsg || '额度不足'}\n\n` +
        '请在公众平台「付费管理」购买手机号快速验证资源包，或等待体验额度重置规则说明。',
      suggestWxLogin: true,
    };
  }

  if (errMsg.includes('deny') || errMsg.includes('cancel')) {
    return null;
  }

  return {
    title: '手机号授权未完成',
    content:
      (errMsg ? `微信返回：${errMsg}\n\n` : '') +
      '请用真机（非开发者工具）点击「微信授权手机号登录」。若仍失败，多为公众平台未开通能力，见上条说明或使用微信快捷登录。',
    suggestWxLogin: true,
  };
}

module.exports = { explainGetPhoneNumberFail };
