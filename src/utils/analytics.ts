/**
 * Google Analytics 服务
 * 提供离线兼容的分析事件追踪功能
 */

// 全局gtag函数类型已在types/index.ts中定义

// 事件类型定义
export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

// 页面浏览事件
export interface PageViewEvent {
  page_title?: string;
  page_location?: string;
  page_path?: string;
}

class AnalyticsService {
  private isOnline: boolean = navigator.onLine;
  private eventQueue: Array<{ type: 'event' | 'page_view'; data: any }> = [];
  private maxQueueSize: number = 100;

  constructor() {
    // 监听网络状态变化
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushEventQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * 检查GA是否可用
   */
  private isGAAvailable(): boolean {
    return typeof window.gtag === 'function';
  }

  /**
   * 发送事件到GA或添加到队列
   */
  private sendOrQueue(type: 'event' | 'page_view', data: any): void {
    if (this.isOnline && this.isGAAvailable()) {
      try {
        if (type === 'event') {
          window.gtag!('event', data.action, {
            event_category: data.category,
            event_label: data.label,
            value: data.value,
            ...data.custom_parameters
          });
        } else if (type === 'page_view') {
          window.gtag!('config', 'G-B0TDRMLHPS', data);
        }
      } catch (error) {
        console.warn('Analytics event failed:', error);
        this.queueEvent(type, data);
      }
    } else {
      this.queueEvent(type, data);
    }
  }

  /**
   * 将事件添加到队列
   */
  private queueEvent(type: 'event' | 'page_view', data: any): void {
    if (this.eventQueue.length >= this.maxQueueSize) {
      // 移除最旧的事件
      this.eventQueue.shift();
    }
    
    this.eventQueue.push({ type, data });
    console.debug('Analytics event queued:', { type, data });
  }

  /**
   * 刷新事件队列
   */
  private flushEventQueue(): void {
    if (!this.isGAAvailable() || this.eventQueue.length === 0) {
      return;
    }

    console.debug('Flushing analytics event queue:', this.eventQueue.length, 'events');
    
    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    eventsToSend.forEach(({ type, data }) => {
      try {
        if (type === 'event') {
          window.gtag!('event', data.action, {
            event_category: data.category,
            event_label: data.label,
            value: data.value,
            ...data.custom_parameters
          });
        } else if (type === 'page_view') {
          window.gtag!('config', 'G-B0TDRMLHPS', data);
        }
      } catch (error) {
        console.warn('Failed to send queued analytics event:', error);
      }
    });
  }

  /**
   * 追踪自定义事件
   */
  trackEvent(event: AnalyticsEvent): void {
    this.sendOrQueue('event', event);
  }

  /**
   * 追踪页面浏览
   */
  trackPageView(titleOrEvent?: string | PageViewEvent, path?: string): void {
    let pageData: PageViewEvent & { send_page_view: boolean };
    
    if (typeof titleOrEvent === 'string') {
      // 支持 trackPageView(title, path) 的调用方式
      pageData = {
        page_title: titleOrEvent,
        page_path: path || window.location.pathname,
        page_location: window.location.href,
        send_page_view: true
      };
    } else {
      // 支持 trackPageView(event) 的调用方式
      const event = titleOrEvent || {};
      pageData = {
        page_title: event.page_title || document.title,
        page_location: event.page_location || window.location.href,
        page_path: event.page_path || window.location.pathname,
        send_page_view: true
      };
    }
    
    this.sendOrQueue('page_view', pageData);
  }

  /**
   * 追踪会议相关事件
   */
  trackMeetingEvent(action: 'view' | 'book' | 'cancel' | 'search' | 'filter', meetingId?: string, additionalData?: Record<string, any>): void {
    this.trackEvent({
      action: `meeting_${action}`,
      category: 'meeting',
      label: meetingId,
      custom_parameters: {
        meeting_id: meetingId,
        ...additionalData
      }
    });
  }

  /**
   * 追踪用户交互事件
   */
  trackUserInteraction(action: string, element: string, additionalData?: Record<string, any>): void {
    this.trackEvent({
      action,
      category: 'user_interaction',
      label: element,
      custom_parameters: additionalData
    });
  }

  /**
   * 追踪应用性能事件
   */
  trackPerformance(metric: string, value: number, additionalData?: Record<string, any>): void {
    this.trackEvent({
      action: 'performance_metric',
      category: 'performance',
      label: metric,
      value,
      custom_parameters: additionalData
    });
  }

  /**
   * 追踪错误事件
   */
  trackError(error: string, fatal: boolean = false, additionalData?: Record<string, any>): void {
    this.trackEvent({
      action: 'exception',
      category: 'error',
      label: error,
      custom_parameters: {
        fatal,
        ...additionalData
      }
    });
  }

  /**
   * 获取队列状态（用于调试）
   */
  getQueueStatus(): { queueLength: number; isOnline: boolean; isGAAvailable: boolean } {
    return {
      queueLength: this.eventQueue.length,
      isOnline: this.isOnline,
      isGAAvailable: this.isGAAvailable()
    };
  }
}

// 创建单例实例
export const analytics = new AnalyticsService();

// 导出便捷函数
export const trackEvent = (event: AnalyticsEvent) => analytics.trackEvent(event);
export const trackPageView = (titleOrEvent?: string | PageViewEvent, path?: string) => analytics.trackPageView(titleOrEvent, path);
export const trackMeetingEvent = (action: 'view' | 'book' | 'cancel' | 'search' | 'filter', meetingId?: string, additionalData?: Record<string, any>) => 
  analytics.trackMeetingEvent(action, meetingId, additionalData);
export const trackUserInteraction = (action: string, element: string, additionalData?: Record<string, any>) => 
  analytics.trackUserInteraction(action, element, additionalData);
export const trackPerformance = (metric: string, value: number, additionalData?: Record<string, any>) => 
  analytics.trackPerformance(metric, value, additionalData);
export const trackError = (error: string, fatal?: boolean, additionalData?: Record<string, any>) => 
  analytics.trackError(error, fatal, additionalData);