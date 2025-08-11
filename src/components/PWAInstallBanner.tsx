import React, { useState, useEffect } from 'react';
import { Button } from 'antd-mobile';
import { DownlandOutline, CloseOutline } from 'antd-mobile-icons';
import { pwaService } from '../lib/pwa';

interface PWAInstallBannerProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onInstall, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // 检查是否已经是PWA模式
    if (pwaService.isPWAInstalled()) {
      return;
    }

    // 检查是否支持PWA
    if (!pwaService.isPWASupported()) {
      return;
    }

    // 检查是否已经被用户关闭过
    const bannerDismissed = localStorage.getItem('pwa-banner-dismissed');
    if (bannerDismissed === 'true') {
      return;
    }

    // 监听安装提示事件
    const handleInstallPrompt = (event: any) => {
      event.preventDefault();
      setInstallEvent(event);
      
      // 延迟显示横幅
      setTimeout(() => {
        setVisible(true);
      }, 5000); // 5秒后显示横幅
    };

    pwaService.onInstallPrompt(handleInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;

    setIsInstalling(true);
    try {
      const installed = await pwaService.showInstallPrompt(installEvent);
      if (installed) {
        setVisible(false);
        onInstall?.();
      }
    } catch (error) {
      console.error('PWA安装失败:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('pwa-banner-dismissed', 'true');
    onDismiss?.();
  };

  if (!visible || !installEvent) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center flex-1">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3">
            <DownlandOutline className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              安装到主屏幕
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              获得更好的使用体验
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="small"
            fill="none"
            onClick={handleDismiss}
            className="text-gray-500 dark:text-gray-400"
          >
            <CloseOutline />
          </Button>
          <Button
            size="small"
            color="primary"
            onClick={handleInstall}
            loading={isInstalling}
            disabled={isInstalling}
          >
            {isInstalling ? '安装中' : '安装'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;