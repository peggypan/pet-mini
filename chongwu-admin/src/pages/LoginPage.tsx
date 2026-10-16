import { Button, Card, Form, Input, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/auth';

type LoginForm = { username: string; password: string };

export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      await adminLogin(values.username, values.password);
      message.success('登录成功');
      navigate('/');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card">
        <div className="login-brand">
          <span className="admin-logo-mark" style={{ margin: '0 auto', display: 'grid' }}>
            🐾
          </span>
          <h1>宠头头运营后台</h1>
          <p>管理社区、活动、地图标点与商家入驻</p>
          <p style={{ marginTop: 12 }}>
            <span className="cloud-badge">微信云开发 · Web SDK 调用 api 云函数</span>
          </p>
          {import.meta.env.DEV ? (
            <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
              开发环境默认账号 admin / demo（admin_users 为空时云函数自动创建，上线前请改密）
            </p>
          ) : null}
        </div>
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={
            import.meta.env.DEV ? { username: 'admin', password: 'demo' } : { username: '', password: '' }
          }
        >
          <Form.Item name="username" label="账号" rules={[{ required: true }]}>
            <Input size="large" placeholder="管理员账号" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password size="large" placeholder="密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            进入控制台
          </Button>
        </Form>
      </Card>
    </div>
  );
}
