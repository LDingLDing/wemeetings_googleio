import React, { useState, useEffect } from 'react';
import { List, Button, Toast } from 'antd-mobile';
import { pwaService } from '../lib/pwa';

interface NotificationStatusProps {
  onPermissionChange?: (permission: NotificationPermission) => void;
}

const NotificationStatus: React.FC<NotificationStatusProps> = ({ onPermissionChange }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // 检查当前通知权限状态
    const currentPermission = pwaService.getNotificationPermission();
    setPermission(currentPermission);
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const result = await pwaService.requestNotificationPermission();
      setPermission(result);
      onPermissionChange?.(result);
      
      if (result === 'granted') {
        Toast.show({
          content: '通知权限已开启',
          icon: 'success'
        });
      } else if (result === 'denied') {
        Toast.show({
          content: '通知权限被拒绝，请在浏览器设置中手动开启',
          icon: 'fail'
        });
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

  const getStatusInfo = () => {
    switch (permission) {
      case 'granted':
        return {
          icon: <CheckCircleOutline className="text-green-500" />,
          text: '已开启',
          description: '您将收到会议提醒通知',
          color: 'text-green-600 dark:text-green-400',
          showButton: false
        };
      case 'denied':
        return {
          icon: <CloseCircleOutline className="text-red-500" />,
          text: '已拒绝',
          description: '请在浏览器设置中手动开启通知权限',
          color: 'text-red-600 dark:text-red-400',
          showButton: false
        };
      default:
        return {
          icon: <ExclamationCircleOutline className="text-orange-500" />,
          text: '未设置',
          description: '开启后可接收会议提醒',
          color: 'text-orange-600 dark:text-orange-400',
          showButton: true
        };
    }
  };

  const statusInfo = getStatusInfo();

  const openBrowserSettings = () => {
    Toast.show({
      content: '请在浏览器地址栏左侧点击锁图标，然后开启通知权限',
      duration: 3000
    });
  };

  return (
    <List.Item
      prefix={<BellOutline className="text-lg" />}
      title="通知权限"
      description={
        <div className="mt-1">
          <div className="flex items-center mb-1">
            {statusInfo.icon}
            <span className={`ml-1 text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {statusInfo.description}
          </p>
        </div>
      }
      extra={
        <div className="flex flex-col items-end space-y-2">
          {statusInfo.showButton && (
            <Button
              size="small"
              color="primary"
              onClick={handleRequestPermission}
              loading={isRequesting}
              disabled={isRequesting}
            >
              {isRequesting ? '请求中' : '开启'}
            </Button>
          )}
          
          {permission === 'denied' && (
            <Button
              size="small"
              fill="none"
              onClick={openBrowserSettings}
              className="text-xs"
            >
              设置说明
            </Button>
          )}
        </div>
      }
    />
  );
};

export default NotificationStatus;