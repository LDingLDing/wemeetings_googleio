import { audioService } from './audioService';

// PWA 相关功能
export class PWAService {
  private static instance: PWAService;
  private swRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  public static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  // 注册 Service Worker
  public async registerServiceWorker(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = registration;
        
        console.log('Service Worker registered successfully:', registration);
        
        // 监听更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 新版本可用
                this.showUpdateAvailable();
              }
            });
          }
        });
        
        return true;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return false;
      }
    }
    return false;
  }

  // 检查是否支持 PWA
  public isPWASupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // 检查是否已安装为 PWA
  public isPWAInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  // 请求通知权限
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return 'denied';
  }

  // 检查通知权限
  public getNotificationPermission(): NotificationPermission {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  // 发送本地通知
  public async sendLocalNotification(
    title: string, 
    options: NotificationOptions = {},
    userPreferences?: { enableSound?: boolean; enableVibration?: boolean }
  ): Promise<void> {
    if (this.getNotificationPermission() === 'granted') {
      const defaultOptions: NotificationOptions = {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        silent: !userPreferences?.enableSound, // 根据用户设置控制声音
        ...options
      };

      // 添加震动支持
      if (userPreferences?.enableVibration && 'vibrate' in navigator) {
        // 震动功能通过navigator.vibrate单独处理
      }
      
      // 播放自定义声音（如果启用且支持）
      if (userPreferences?.enableSound) {
        try {
          await audioService.playNotificationSound(true);
        } catch (error) {
          console.warn('播放通知声音失败:', error);
        }
      }
      
      if (this.swRegistration) {
        // 通过 Service Worker 发送
        await this.swRegistration.showNotification(title, defaultOptions);
      } else {
        // 直接发送
        new Notification(title, defaultOptions);
      }
    }
  }

  // 订阅推送通知
  public async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      console.error('Service Worker not registered');
      return null;
    }

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          // 这里应该是你的 VAPID 公钥
          'your-vapid-public-key'
        )
      });
      
      console.log('Push subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  // 取消推送订阅
  public async unsubscribeFromPush(): Promise<boolean> {
    if (!this.swRegistration) {
      return false;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Push unsubscription successful');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }

  // 显示更新可用提示
  private showUpdateAvailable(): void {
    // 这里可以显示一个提示，告知用户有新版本可用
    console.log('New version available! Please refresh the page.');
    
    // 可以发送自定义事件
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }

  // 转换 VAPID 密钥格式
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // 检查网络状态
  public isOnline(): boolean {
    return navigator.onLine;
  }

  // 监听网络状态变化
  public onNetworkChange(callback: (isOnline: boolean) => void): void {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }

  // 获取安装提示
  public onInstallPrompt(callback: (event: any) => void): void {
    window.addEventListener('beforeinstallprompt', callback);
  }

  // 发送会议提醒通知
  public async sendMeetingReminder(
    meetingTitle: string,
    meetingTime: string,
    reminderMinutes: number,
    userPreferences?: { enableSound?: boolean; enableVibration?: boolean }
  ): Promise<void> {
    const title = '会议提醒';
    const body = `${meetingTitle} 将在 ${reminderMinutes} 分钟后开始\n时间：${meetingTime}`;
    
    await this.sendLocalNotification(title, {
      body,
      tag: `meeting-reminder-${Date.now()}`,
      requireInteraction: true,
      // actions属性在某些浏览器中不支持，移除以避免类型错误
    }, userPreferences);
  }

  // 测试通知功能
  public async testNotification(
    userPreferences?: { enableSound?: boolean; enableVibration?: boolean }
  ): Promise<void> {
    if (this.getNotificationPermission() !== 'granted') {
      throw new Error('通知权限未授予');
    }

    await this.sendLocalNotification('测试通知', {
      body: '这是一条测试通知，用于验证通知功能是否正常工作。',
      tag: 'test-notification'
    }, userPreferences);
  }

  // 显示安装提示
  public async showInstallPrompt(event: any): Promise<boolean> {
    if (event) {
      event.prompt();
      const { outcome } = await event.userChoice;
      return outcome === 'accepted';
    }
    return false;
  }
}

// 导出单例实例
export const pwaService = PWAService.getInstance();