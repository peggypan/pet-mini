import { Button, Card, Form, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();

  const onFinish = () => {
    sessionStorage.setItem('chongwu_admin_token', 'mock-token');
    message.success('登录成功（演示）');
    navigate('/');
  };

  return (
    <div className="login-page">
      <Card className="login-card">
        <div className="login-brand">
          <span className="admin-logo-mark" style={{ margin: '0 auto', display: 'grid' }}>
            🐾
          </span>
          <h1>遛搭搭运营后台</h1>
          <p>管理社区、活动、地图标点与商家入驻</p>
          <p style={{ marginTop: 12 }}>
            <span className="cloud-badge">微信云开发 · 接口待接入</span>
          </p>
        </div>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ username: 'admin', password: 'demo' }}>
          <Form.Item name="username" label="账号" rules={[{ required: true }]}>
            <Input size="large" placeholder="管理员账号" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password size="large" placeholder="密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block>
            进入控制台
          </Button>
        </Form>
      </Card>
    </div>
  );
}
