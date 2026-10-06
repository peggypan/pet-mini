import { useEffect, useState } from 'react';
import { Breadcrumb, Layout, Menu, Dropdown, Avatar, Space, Button, Tag } from 'antd';
import { UserOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { buildAdminMenuItems } from '../config/menu';
import { PendingBadgeProvider, usePendingBadges } from '../context/PendingBadgeContext';
import { getRouteMeta } from '../config/routes';

const { Sider, Header, Content } = Layout;

function openKeysFromPath(pathname: string): string[] {
  if (pathname.startsWith('/community')) return ['community-group'];
  if (pathname.startsWith('/events')) return ['event-group'];
  if (pathname.startsWith('/merchants')) return ['merchant-group'];
  if (pathname.startsWith('/host')) return ['host-group'];
  if (pathname.startsWith('/users') || pathname.startsWith('/pets')) return ['user-group'];
  if (pathname.startsWith('/settings')) return ['settings-group'];
  if (pathname.startsWith('/content') || pathname === '/banners') return ['content-group'];
  return [];
}

function selectedKeys(pathname: string): string[] {
  if (pathname === '/') return ['/'];
  return [pathname];
}

function AdminLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { badges } = usePendingBadges();
  const menuItems = buildAdminMenuItems(badges);
  const meta = getRouteMeta(location.pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>(() => openKeysFromPath(location.pathname));

  useEffect(() => {
    document.title = `${meta.title} · 遛搭搭运营台`;
  }, [meta.title]);

  useEffect(() => {
    setOpenKeys((prev) => [...new Set([...prev, ...openKeysFromPath(location.pathname)])]);
  }, [location.pathname]);

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: () => {
          sessionStorage.removeItem('chongwu_admin_token');
          navigate('/login');
        },
      },
    ],
  };

  const breadcrumbItems = meta.breadcrumb.map((label, i) => {
    const isLast = i === meta.breadcrumb.length - 1;
    if (isLast) return { title: label };
    return { title: <span>{label}</span> };
  });

  return (
    <Layout className="admin-root">
      <Sider
        width={240}
        collapsedWidth={72}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        className="admin-sider"
        breakpoint="lg"
      >
        <div className="admin-logo" onClick={() => navigate('/')}>
          <span className="admin-logo-mark">🐾</span>
          {!collapsed && <span>遛搭搭运营台</span>}
        </div>
        <Menu
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={selectedKeys(location.pathname)}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
          onClick={({ key }) => {
            if (!String(key).endsWith('-group')) navigate(String(key));
          }}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Space size="middle">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <Breadcrumb items={breadcrumbItems} />
          </Space>
          <Space size="large">
            <Tag className="cloud-badge">云开发 · Mock 数据</Tag>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ background: '#1E88E5' }} icon={<UserOutlined />} />
                <span>运营管理员</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content className="admin-content-wrap">
          <div className="admin-content">
            <Outlet />
          </div>
          <footer className="admin-footer">
            <span>遛搭搭小程序运营后台</span>
            <Link to="/">返回工作台</Link>
          </footer>
        </Content>
      </Layout>
    </Layout>
  );
}

export function AdminLayout() {
  return (
    <PendingBadgeProvider>
      <AdminLayoutInner />
    </PendingBadgeProvider>
  );
}
