import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { LoginPage } from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const UserListPage = lazy(() => import('./pages/users/UserListPage').then((m) => ({ default: m.UserListPage })));
const PetListPage = lazy(() => import('./pages/pets/PetListPage').then((m) => ({ default: m.PetListPage })));
const PostListPage = lazy(() => import('./pages/community/PostListPage').then((m) => ({ default: m.PostListPage })));
const CommentListPage = lazy(() =>
  import('./pages/community/CommentListPage').then((m) => ({ default: m.CommentListPage })),
);
const TopicConfigPage = lazy(() =>
  import('./pages/community/TopicConfigPage').then((m) => ({ default: m.TopicConfigPage })),
);
const ZoneConfigPage = lazy(() =>
  import('./pages/community/ZoneConfigPage').then((m) => ({ default: m.ZoneConfigPage })),
);
const BuddyListPage = lazy(() => import('./pages/buddy/BuddyListPage').then((m) => ({ default: m.BuddyListPage })));
const EventListPage = lazy(() => import('./pages/events/EventListPage').then((m) => ({ default: m.EventListPage })));
const SignupListPage = lazy(() => import('./pages/events/SignupListPage').then((m) => ({ default: m.SignupListPage })));
const HostApplyReviewPage = lazy(() =>
  import('./pages/host/HostApplyReviewPage').then((m) => ({ default: m.HostApplyReviewPage })),
);
const EventQualifyManagePage = lazy(() =>
  import('./pages/host/EventQualifyManagePage').then((m) => ({ default: m.EventQualifyManagePage })),
);
const ClubManagePage = lazy(() =>
  import('./pages/host/ClubManagePage').then((m) => ({ default: m.ClubManagePage })),
);
const ClubMemberManagePage = lazy(() =>
  import('./pages/host/ClubMemberManagePage').then((m) => ({ default: m.ClubMemberManagePage })),
);
const MapPointReviewPage = lazy(() =>
  import('./pages/map/MapPointReviewPage').then((m) => ({ default: m.MapPointReviewPage })),
);
const RescueListPage = lazy(() => import('./pages/rescue/RescueListPage').then((m) => ({ default: m.RescueListPage })));
const MerchantListPage = lazy(() =>
  import('./pages/merchants/MerchantListPage').then((m) => ({ default: m.MerchantListPage })),
);
const MerchantApplyPage = lazy(() =>
  import('./pages/merchants/MerchantApplyPage').then((m) => ({ default: m.MerchantApplyPage })),
);
const BannerListPage = lazy(() => import('./pages/content/BannerListPage').then((m) => ({ default: m.BannerListPage })));
const SplashAdManagePage = lazy(() =>
  import('./pages/content/SplashAdManagePage').then((m) => ({ default: m.SplashAdManagePage })),
);
const PointsLedgerPage = lazy(() =>
  import('./pages/points/PointsLedgerPage').then((m) => ({ default: m.PointsLedgerPage })),
);
const SensitiveWordsPage = lazy(() =>
  import('./pages/settings/SensitiveWordsPage').then((m) => ({ default: m.SensitiveWordsPage })),
);

function RequireAuth({ children }: { children: ReactNode }) {
  const token = sessionStorage.getItem('chongwu_admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function PageFallback() {
  return (
    <div className="page-loading">
      <Spin size="large" tip="加载中…" />
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1E88E5',
          borderRadius: 10,
          fontFamily: "'DM Sans', 'Noto Sans SC', system-ui, sans-serif",
          colorBgLayout: '#F5F8FC',
        },
        components: {
          Menu: {
            itemSelectedBg: 'rgba(30, 136, 229, 0.12)',
            itemSelectedColor: '#1E88E5',
          },
          Table: {
            headerBg: '#F5F8FC',
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<PageFallback />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route path="users" element={<Suspense fallback={<PageFallback />}><UserListPage /></Suspense>} />
            <Route path="pets" element={<Suspense fallback={<PageFallback />}><PetListPage /></Suspense>} />
            <Route path="community/posts" element={<Suspense fallback={<PageFallback />}><PostListPage /></Suspense>} />
            <Route path="community/comments" element={<Suspense fallback={<PageFallback />}><CommentListPage /></Suspense>} />
            <Route path="community/topics" element={<Suspense fallback={<PageFallback />}><TopicConfigPage /></Suspense>} />
            <Route path="community/zones" element={<Suspense fallback={<PageFallback />}><ZoneConfigPage /></Suspense>} />
            <Route path="buddy" element={<Suspense fallback={<PageFallback />}><BuddyListPage /></Suspense>} />
            <Route path="events" element={<Suspense fallback={<PageFallback />}><EventListPage /></Suspense>} />
            <Route path="events/signups" element={<Suspense fallback={<PageFallback />}><SignupListPage /></Suspense>} />
            <Route path="events/qualify" element={<Navigate to="/host/event-qualify" replace />} />
            <Route path="host/applies" element={<Suspense fallback={<PageFallback />}><HostApplyReviewPage /></Suspense>} />
            <Route path="host/event-qualify" element={<Suspense fallback={<PageFallback />}><EventQualifyManagePage /></Suspense>} />
            <Route path="host/clubs" element={<Suspense fallback={<PageFallback />}><ClubManagePage /></Suspense>} />
            <Route path="host/members" element={<Suspense fallback={<PageFallback />}><ClubMemberManagePage /></Suspense>} />
            <Route path="map-points" element={<Suspense fallback={<PageFallback />}><MapPointReviewPage /></Suspense>} />
            <Route path="rescue" element={<Suspense fallback={<PageFallback />}><RescueListPage /></Suspense>} />
            <Route path="merchants" element={<Suspense fallback={<PageFallback />}><MerchantListPage /></Suspense>} />
            <Route path="merchants/applies" element={<Suspense fallback={<PageFallback />}><MerchantApplyPage /></Suspense>} />
            <Route path="clubs" element={<Navigate to="/host/clubs" replace />} />
            <Route path="clubs/applies" element={<Navigate to="/host/applies" replace />} />
            <Route path="banners" element={<Suspense fallback={<PageFallback />}><BannerListPage /></Suspense>} />
            <Route path="content/splash-ads" element={<Suspense fallback={<PageFallback />}><SplashAdManagePage /></Suspense>} />
            <Route path="points" element={<Suspense fallback={<PageFallback />}><PointsLedgerPage /></Suspense>} />
            <Route path="settings/sensitive" element={<Suspense fallback={<PageFallback />}><SensitiveWordsPage /></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
