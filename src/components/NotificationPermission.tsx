import React, { useState, useEffect } from 'react';
import { Modal, Toast } from 'antd-mobile';
import { pwaService } from '../lib/pwa';
import {BellOutline} from 'antd-mobile-icons';

interface NotificationPermissionProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  onClose?: () => void;
  autoShow?: boolean;
}

const NotificationPermission: React.FC<NotificationPermissionProps> = ({
  onPermissionGranted,
  onPermissionDenied,
  onClose,
  autoShow = false
}) => {
  const [visible, setVisible] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // 检查当前通知权限状态
    const currentPermission = pwaService.getNotificationPermission();
    setPermission(currentPermission);

    // 如果设置了自动显示且权限为默认状态，则显示权限请求
    if (autoShow && currentPermission === 'default') {
      // 延迟显示，让用户先体验应用
      setTimeout(() => {
        setVisible(true);
      }, 5000);
    }
  }, [autoShow]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const result = await pwaService.requestNotificationPermission();
      setPermission(result);
      
      if (result === 'granted') {
        Toast.show({
          content: '通知权限已开启，您将收到会议提醒',
          icon: 'success'
        });
        onPermissionGranted?.();
        setVisible(false);
      } else if (result === 'denied') {
        Toast.show({
          content: '通知权限被拒绝，您可以在浏览器设置中手动开启',
          icon: 'fail'
        });
        onPermissionDenied?.();
        setVisible(false);
      }
    } catch (error) {
      console.error('请求通知权限失败:', error);
      Toast.show({
        content: '请求权限失败，请稍后重试',
        icon: 'fail'
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  const handleLater = () => {
    setVisible(false);
    // 记录用户选择稍后，下次启动时再次提醒
    localStorage.setItem('notification-permission-later', new Date().toISOString());
    onClose?.();
  };

  const handleNeverAsk = () => {
    setVisible(false);
    // 记录用户选择不再询问
    localStorage.setItem('notification-permission-never', 'true');
    onClose?.();
  };

  // 如果权限已经被处理过，不显示组件
  if (permission !== 'default') {
    return null;
  }

  return (
    <Modal
      visible={visible}
      title="开启通知提醒"
      closeOnMaskClick={false}
      onClose={handleClose}
      content={
        <div className="text-center py-4">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-3 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
              <BellOutline />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
              不错过任何重要会议
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              开启通知权限，我们将在会议开始前及时提醒您：
            </p>
          </div>
          
          <div className="text-left space-y-2 mb-6">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              会议开始前15分钟提醒
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              会议开始前5分钟提醒
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              支持声音和震动提醒
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              即使应用在后台也能收到
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
            <div className="flex items-start">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                如果您拒绝权限，可以稍后在浏览器设置或应用设置中手动开启通知。
              </p>
            </div>
          </div>
        </div>
      }
      actions={[
        {
          key: 'never',
          text: '不再询问',
          onClick: handleNeverAsk,
          style: { color: '#999' }
        },
        {
          key: 'later',
          text: '稍后',
          onClick: handleLater
        },
        {
          key: 'allow',
          text: isRequesting ? '请求中...' : '开启通知',
          onClick: handleRequestPermission,
          disabled: isRequesting,
          style: { 
            color: '#1677ff',
            fontWeight: 'bold'
          }
        }
      ]}
    />
  );
};

export default NotificationPermission;