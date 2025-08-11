// 音频服务 - 处理声音提醒功能
export class AudioService {
  private static instance: AudioService;
  private audioContext: AudioContext | null = null;
  private notificationAudio: HTMLAudioElement | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  // 初始化音频服务
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // 创建音频上下文（用于检测音频支持）
      if ('AudioContext' in window || 'webkitAudioContext' in window) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // 创建通知音频元素
      this.notificationAudio = new Audio();
      this.notificationAudio.preload = 'auto';
      
      // 设置音频源（使用数据URL创建简单的提示音）
      this.notificationAudio.src = this.generateNotificationSound();
      
      // 预加载音频
      await this.preloadAudio();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('音频服务初始化失败:', error);
      return false;
    }
  }

  // 生成通知提示音（使用Web Audio API创建简单的铃声）
  private generateNotificationSound(): string {
    // 创建一个简单的提示音频数据URL
    // 这是一个440Hz的正弦波，持续0.5秒
    const sampleRate = 44100;
    const duration = 0.5;
    const frequency = 440; // A4音符
    const samples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // 生成音频数据
    let offset = 44;
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
      const amplitude = Math.max(0, 1 - i / samples); // 渐弱效果
      const value = Math.floor(sample * amplitude * 32767);
      view.setInt16(offset, value, true);
      offset += 2;
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  // 预加载音频
  private async preloadAudio(): Promise<void> {
    if (!this.notificationAudio) return;

    return new Promise((resolve, reject) => {
      if (!this.notificationAudio) {
        reject(new Error('音频元素未初始化'));
        return;
      }

      const handleCanPlay = () => {
        this.notificationAudio!.removeEventListener('canplaythrough', handleCanPlay);
        this.notificationAudio!.removeEventListener('error', handleError);
        resolve();
      };

      const handleError = () => {
        this.notificationAudio!.removeEventListener('canplaythrough', handleCanPlay);
        this.notificationAudio!.removeEventListener('error', handleError);
        reject(new Error('音频加载失败'));
      };

      this.notificationAudio.addEventListener('canplaythrough', handleCanPlay);
      this.notificationAudio.addEventListener('error', handleError);
      
      // 如果音频已经可以播放，直接resolve
      if (this.notificationAudio.readyState >= 3) {
        handleCanPlay();
      }
    });
  }

  // 播放通知声音
  public async playNotificationSound(enableSound: boolean = true): Promise<boolean> {
    if (!enableSound || !this.isInitialized || !this.notificationAudio) {
      return false;
    }

    try {
      // 重置音频到开始位置
      this.notificationAudio.currentTime = 0;
      
      // 设置音量
      this.notificationAudio.volume = 0.6;
      
      // 播放音频
      await this.notificationAudio.play();
      return true;
    } catch (error) {
      console.error('播放通知声音失败:', error);
      
      // 如果是因为用户交互限制，尝试在用户下次交互时播放
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.schedulePlayOnUserInteraction();
      }
      
      return false;
    }
  }

  // 在用户下次交互时播放声音
  private schedulePlayOnUserInteraction(): void {
    const playOnInteraction = async () => {
      try {
        if (this.notificationAudio) {
          this.notificationAudio.currentTime = 0;
          await this.notificationAudio.play();
          // 播放成功后移除监听器
          document.removeEventListener('click', playOnInteraction);
          document.removeEventListener('touchstart', playOnInteraction);
        }
      } catch (error) {
        console.error('用户交互后播放声音失败:', error);
      }
    };

    // 监听用户交互事件
    document.addEventListener('click', playOnInteraction, { once: true });
    document.addEventListener('touchstart', playOnInteraction, { once: true });
  }

  // 测试音频播放
  public async testSound(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.playNotificationSound(true);
  }

  // 检查音频支持
  public isAudioSupported(): boolean {
    return 'Audio' in window && this.isInitialized;
  }

  // 获取音频状态
  public getAudioStatus(): {
    isInitialized: boolean;
    isSupported: boolean;
    hasAudioContext: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      isSupported: this.isAudioSupported(),
      hasAudioContext: this.audioContext !== null
    };
  }

  // 清理资源
  public dispose(): void {
    if (this.notificationAudio) {
      this.notificationAudio.pause();
      this.notificationAudio.src = '';
      this.notificationAudio = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isInitialized = false;
  }
}

// 导出单例实例
export const audioService = AudioService.getInstance();

// 在应用启动时初始化音频服务
export const initializeAudioService = async (): Promise<boolean> => {
  try {
    return await audioService.initialize();
  } catch (error) {
    console.error('音频服务初始化失败:', error);
    return false;
  }
};