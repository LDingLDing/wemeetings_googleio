import React, { useState, useEffect } from 'react';
import { Modal } from 'antd-mobile';
import { DownlandOutline, CloseOutline } from 'antd-mobile-icons';
import { pwaService } from '../lib/pwa';

interface PWAInstallPromptProps {
  onClose?: () => void;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onClose }) => {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 检查是否已经是PWA模式
    if (pwaService.isPWAInstalled()) {
      return;
    }

    // 检查是否已经被用户关闭过
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const dismissedDate = new Date(dismissedTime);
      const now = new Date();
      const daysDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 3600 * 24);
      
      // 如果用户在7天内关闭过，就不再显示
      if (daysDiff < 7) {
        setDismissed(true);
        return;
      }
    }

    // 监听安装提示事件
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event);
      
      // 延迟显示，让用户先体验应用
      setTimeout(() => {
        if (!dismissed) {
          setVisible(true);
        }
      }, 3000); // 3秒后显示
    };

    pwaService.onInstallPrompt(handleInstallPrompt);

    return () => {
      // 清理事件监听器
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, [dismissed]);

  const handleInstall = async () => {
    if (!installEvent) return;

    setIsInstalling(true);
    try {
      const installed = await pwaService.showInstallPrompt(installEvent);
      if (installed) {
        setVisible(false);
        onClose?.();
        // 安装成功后的反馈
        setTimeout(() => {
          Modal.alert({
            title: '安装成功！',
            content: '2025 Google开发者大会已添加到您的主屏幕，您可以像使用原生应用一样使用它。',
            confirmText: '好的'
          });
        }, 500);
      }
    } catch (error) {
      console.error('PWA安装失败:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    onClose?.();
  };

  const handleLater = () => {
    setVisible(false);
    onClose?.();
  };

  if (!visible || !installEvent) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      title="安装应用到主屏幕"
      closeOnMaskClick={false}
      onClose={handleLater}
      content={
        <div className="text-center py-4">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <DownlandOutline className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
              获得更好的体验
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              将2025 Google开发者大会安装到您的设备主屏幕，享受：
            </p>
          </div>
          
          <div className="text-left space-y-2 mb-6">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              更快的启动速度
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              离线访问能力
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              会议提醒通知
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              原生应用体验
            </div>
          </div>
        </div>
      }
      actions={[
        {
          key: 'dismiss',
          text: '不再提醒',
          onClick: handleDismiss,
          style: { color: '#999' }
        },
        {
          key: 'later',
          text: '稍后',
          onClick: handleLater
        },
        {
          key: 'install',
          text: isInstalling ? '安装中...' : '立即安装',
          onClick: handleInstall,
          disabled: isInstalling,
          style: { 
            color: '#1677ff',
            fontWeight: 'bold'
          }
        }
      ]}
    />
  );
};

export default PWAInstallPrompt;