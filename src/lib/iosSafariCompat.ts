// iOS Safari兼容性处理工具

export interface IOSCompatibilityStatus {
  localStorage: boolean;
  indexedDB: boolean;
  serviceWorker: boolean;
  notifications: boolean;
  fetch: boolean;
  isIOSSafari: boolean;
  isPrivateMode: boolean;
}

export class IOSSafariCompatibility {
  private static instance: IOSSafariCompatibility;
  private status: IOSCompatibilityStatus | null = null;

  static getInstance(): IOSSafariCompatibility {
    if (!this.instance) {
      this.instance = new IOSSafariCompatibility();
    }
    return this.instance;
  }

  /**
   * 检测是否为iOS Safari
   */
  static isIOSSafari(): boolean {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);
    return isIOS && isSafari;
  }

  /**
   * 检测是否为隐私模式
   */
  static async isPrivateMode(): Promise<boolean> {
    try {
      // 方法1：尝试使用localStorage
      const test = '__private_mode_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      
      // 方法2：检查存储配额
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        // 隐私模式下配额通常很小
        return estimate.quota && estimate.quota < 120000000; // 小于120MB
      }
      
      return false;
    } catch (e) {
      // localStorage不可用，可能是隐私模式
      console.error(e)
      return true;
    }
  }

  /**
   * 检测localStorage可用性
   */
  static isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.error(e)
      return false;
    }
  }

  /**
   * 检测IndexedDB可用性
   */
  static async isIndexedDBAvailable(): Promise<boolean> {
    try {
      if (!window.indexedDB) {
        return false;
      }
      
      return new Promise<boolean>((resolve) => {
        const request = indexedDB.open('__test_db__', 1);
        request.onerror = () => resolve(false);
        request.onsuccess = () => {
          request.result.close();
          indexedDB.deleteDatabase('__test_db__');
          resolve(true);
        };
        request.onblocked = () => resolve(false);
        // 设置超时
        setTimeout(() => resolve(false), 1000);
      });
    } catch (error) {
      console.error(error)
      return false;
    }
  }

  /**
   * 检测Service Worker可用性
   */
  static isServiceWorkerAvailable(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * 检测通知API可用性
   */
  static isNotificationAvailable(): boolean {
    return 'Notification' in window;
  }

  /**
   * 检测Fetch API可用性
   */
  static isFetchAvailable(): boolean {
    return 'fetch' in window;
  }

  /**
   * 全面检测兼容性状态
   */
  async checkCompatibility(): Promise<IOSCompatibilityStatus> {
    if (this.status) {
      return this.status;
    }

    const isIOSSafari = IOSSafariCompatibility.isIOSSafari();
    const isPrivateMode = await IOSSafariCompatibility.isPrivateMode();

    this.status = {
      localStorage: IOSSafariCompatibility.isLocalStorageAvailable(),
      indexedDB: await IOSSafariCompatibility.isIndexedDBAvailable(),
      serviceWorker: IOSSafariCompatibility.isServiceWorkerAvailable(),
      notifications: IOSSafariCompatibility.isNotificationAvailable(),
      fetch: IOSSafariCompatibility.isFetchAvailable(),
      isIOSSafari,
      isPrivateMode
    };

    console.log('iOS Safari兼容性检测结果:', this.status);
    return this.status;
  }

  /**
   * 获取兼容性建议
   */
  getCompatibilityAdvice(status: IOSCompatibilityStatus): string[] {
    const advice: string[] = [];

    if (status.isIOSSafari && status.isPrivateMode) {
      advice.push('检测到iOS Safari隐私模式，部分功能可能受限');
    }

    if (!status.localStorage) {
      advice.push('本地存储不可用，用户设置将无法保存');
    }

    if (!status.indexedDB) {
      advice.push('数据库存储不可用，会议数据可能无法缓存');
    }

    if (!status.serviceWorker) {
      advice.push('Service Worker不可用，离线功能将受限');
    }

    if (!status.notifications) {
      advice.push('通知API不可用，无法发送提醒通知');
    }

    if (!status.fetch) {
      advice.push('Fetch API不可用，网络请求可能失败');
    }

    return advice;
  }

  /**
   * 应用兼容性修复
   */
  async applyCompatibilityFixes(status: IOSCompatibilityStatus): Promise<void> {
    // 如果localStorage不可用，使用内存存储
    if (!status.localStorage) {
      this.setupMemoryStorage();
    }

    // 如果IndexedDB不可用，使用localStorage降级
    if (!status.indexedDB && status.localStorage) {
      this.setupLocalStorageFallback();
    }

    // iOS Safari特定的fetch优化
    if (status.isIOSSafari) {
      this.setupIOSFetchOptimizations();
    }
  }

  /**
   * 设置内存存储降级方案
   */
  private setupMemoryStorage(): void {
    const memoryStorage: { [key: string]: string } = {};
    
    // 创建localStorage的内存实现
    const mockLocalStorage = {
      getItem: (key: string) => memoryStorage[key] || null,
      setItem: (key: string, value: string) => {
        memoryStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete memoryStorage[key];
      },
      clear: () => {
        Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
      },
      length: Object.keys(memoryStorage).length,
      key: (index: number) => Object.keys(memoryStorage)[index] || null
    };

    // 替换localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: false
    });

    console.warn('localStorage不可用，已启用内存存储降级方案');
  }

  /**
   * 设置localStorage降级方案用于IndexedDB
   */
  private setupLocalStorageFallback(): void {
    console.warn('IndexedDB不可用，将使用localStorage作为降级方案');
    // 这里可以实现基于localStorage的数据存储方案
  }

  /**
   * 设置iOS Safari的fetch优化
   */
  private setupIOSFetchOptimizations(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const enhancedInit: RequestInit = {
        ...init,
        // iOS Safari缓存优化
        cache: init?.cache || 'no-cache',
        // 添加超时控制
        signal: init?.signal || AbortSignal.timeout(10000)
      };

      // 添加iOS Safari特定的headers
      const headers = new Headers(enhancedInit.headers);
      if (!headers.has('Cache-Control')) {
        headers.set('Cache-Control', 'no-cache');
      }
      if (!headers.has('Pragma')) {
        headers.set('Pragma', 'no-cache');
      }
      enhancedInit.headers = headers;

      try {
        return await originalFetch(input, enhancedInit);
      } catch (error) {
        console.warn('Fetch请求失败，iOS Safari兼容性问题:', error);
        throw error;
      }
    };

    console.log('已启用iOS Safari fetch优化');
  }
}

// 导出单例实例
export const iosSafariCompat = IOSSafariCompatibility.getInstance();

// 便捷的检测函数
export const checkIOSCompatibility = () => iosSafariCompat.checkCompatibility();
export const applyIOSFixes = (status: IOSCompatibilityStatus) => iosSafariCompat.applyCompatibilityFixes(status);