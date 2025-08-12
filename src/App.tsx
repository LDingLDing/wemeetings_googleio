import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd-mobile';
import zhCN from 'antd-mobile/es/locales/zh-CN';
import { useAppStore } from './store';
import { DataImportService } from './lib/dataImport';
import { pwaService } from './lib/pwa';
import { initializeAudioService } from './lib/audioService';
import { reminderService } from './lib/reminderService';
import { trackPageView, trackError } from './utils/analytics';
import Home from './pages/Home';
import MeetingDetail from './pages/MeetingDetail';
import MySchedule from './pages/MySchedule';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PWAInstallBanner from './components/PWAInstallBanner';
import NotificationPermission from './components/NotificationPermission';
import FirstTimeGuide from './components/FirstTimeGuide';

function App() {
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);
  const [showPWABanner, setShowPWABanner] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false);
  const { initializeApp, loading, error } = useAppStore();

  useEffect(() => {
    const initApp = async () => {
      try {
        // 注册 Service Worker
        if (process.env.NODE_ENV === 'production') {
          await pwaService.registerServiceWorker();
        }
        
        // 初始化音频服务
        await initializeAudioService();
        
        // 初始化数据
        await DataImportService.initializeAppData();
        // 初始化应用状态
        await initializeApp();
        
        // 初始化提醒服务
        const { userPreferences } = useAppStore.getState();
        reminderService.initialize(userPreferences);
        
        // 检查是否需要显示首次引导
        const firstTimeGuideCompleted = localStorage.getItem('firstTimeGuideCompleted');
        if (!firstTimeGuideCompleted) {
          setShowFirstTimeGuide(true);
        }
        
        // 追踪应用启动
        trackPageView({
          page_title: '谷歌开发者大会预约助手',
          page_path: '/'
        });
      } catch (error) {
        console.error('应用初始化失败:', error);
        trackError(`应用初始化失败: ${error}`, true);
      }
    };

    initApp();
  }, [initializeApp]);

  // PWA 功能初始化
  useEffect(() => {
    // 检查PWA安装状态
    const checkPWAStatus = () => {
      if (!pwaService.isPWAInstalled() && pwaService.isPWASupported()) {
        // 根据用户偏好决定显示哪种安装提示
        const preferBanner = localStorage.getItem('pwa-prefer-banner') === 'true';
        if (preferBanner) {
          setShowPWABanner(true);
        } else {
          setShowPWAPrompt(true);
        }
      }
    };

    // 延迟检查，让应用先加载完成
    setTimeout(checkPWAStatus, 2000);

    // 检查通知权限状态
    const checkNotificationPermission = () => {
      const permission = pwaService.getNotificationPermission();
      const neverAsk = localStorage.getItem('notification-permission-never') === 'true';
      const laterTime = localStorage.getItem('notification-permission-later');
      
      if (permission === 'default' && !neverAsk) {
        // 如果用户选择了稍后，检查是否已经过了一天
        if (laterTime) {
          const laterDate = new Date(laterTime);
          const now = new Date();
          const hoursDiff = (now.getTime() - laterDate.getTime()) / (1000 * 3600);
          
          // 24小时后再次提醒
          if (hoursDiff >= 24) {
            setShowNotificationPrompt(true);
          }
        } else {
          // 首次访问，延迟显示通知权限请求
          setTimeout(() => {
            setShowNotificationPrompt(true);
          }, 8000); // 8秒后显示
        }
      }
    };

    setTimeout(checkNotificationPermission, 3000);

    // 监听 PWA 更新
    const handlePWAUpdate = () => {
      if (confirm('发现新版本，是否立即更新？')) {
        window.location.reload();
      }
    };

    window.addEventListener('pwa-update-available', handlePWAUpdate);

    return () => {
      window.removeEventListener('pwa-update-available', handlePWAUpdate);
    };
  }, []);

  // 处理 PWA 安装成功
  const handlePWAInstalled = () => {
    setShowPWAPrompt(false);
    setShowPWABanner(false);
  };

  // 处理 PWA 安装提示关闭
  const handlePWAPromptClose = () => {
    setShowPWAPrompt(false);
    // 用户关闭弹窗后，可以显示横幅
    localStorage.setItem('pwa-prefer-banner', 'true');
    setTimeout(() => {
      setShowPWABanner(true);
    }, 10000); // 10秒后显示横幅
  };

  // 处理横幅关闭
  const handleBannerDismiss = () => {
    setShowPWABanner(false);
  };

  // 处理通知权限
  const handleNotificationPermissionGranted = () => {
    setShowNotificationPrompt(false);
  };

  const handleNotificationPermissionDenied = () => {
    setShowNotificationPrompt(false);
  };

  const handleNotificationPromptClose = () => {
    setShowNotificationPrompt(false);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-2">应用启动失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/meeting/:id" element={<MeetingDetail />} />
              <Route path="/schedule" element={<MySchedule />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
            </Routes>
          </Layout>
          
          {/* PWA 安装提示组件 */}
          {showPWAPrompt && (
            <PWAInstallPrompt onClose={handlePWAPromptClose} />
          )}
          
          {/* PWA 安装横幅 */}
          {showPWABanner && (
            <PWAInstallBanner 
              onInstall={handlePWAInstalled}
              onDismiss={handleBannerDismiss}
            />
          )}
          
          {/* 首次使用引导 */}
          {showFirstTimeGuide && (
            <FirstTimeGuide
              visible={showFirstTimeGuide}
              onClose={() => setShowFirstTimeGuide(false)}
            />
          )}
          
          {/* 通知权限请求 */}
          {showNotificationPrompt && (
            <NotificationPermission
              onPermissionGranted={handleNotificationPermissionGranted}
              onPermissionDenied={handleNotificationPermissionDenied}
              onClose={handleNotificationPromptClose}
              autoShow={true}
            />
          )}
        </Router>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
