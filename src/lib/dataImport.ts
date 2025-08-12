import { Meeting, MeetingDataVersion } from '../types';
import { DatabaseService } from './database';

// 原始JSON数据接口
interface RawMeetingData {
  id?: string;
  标题: string;
  专场: string;
  日期: string;
  开始时间: string;
  结束时间: string;
  时段: string;
  简介: string | null;
  嘉宾: Array<{
    姓名: string;
    头衔: string;
  }>;
}

// 版本信息存储键
const VERSION_STORAGE_KEY = 'meeting_data_version';

export class DataImportService {
  /**
   * 从JSON文件导入会议数据
   */
  static async importMeetingsFromJSON(jsonData: RawMeetingData[]): Promise<void> {
    try {
      // 清空现有数据
      await DatabaseService.clearMeetings();
      
      // 转换数据格式，使用现有ID或生成新ID
      const meetings: Meeting[] = jsonData.map((rawMeeting, index) => ({
        id: rawMeeting.id || `meeting-${String(index + 1).padStart(3, '0')}`,
        标题: rawMeeting.标题,
        专场: rawMeeting.专场,
        日期: rawMeeting.日期,
        开始时间: rawMeeting.开始时间,
        结束时间: rawMeeting.结束时间,
        时段: rawMeeting.时段,
        简介: rawMeeting.简介,
        嘉宾: rawMeeting.嘉宾
      }));
      
      // 批量添加到数据库
      await DatabaseService.addMeetings(meetings);
      
      console.log(`成功导入 ${meetings.length} 个会议数据`);
    } catch (error) {
      console.error('导入会议数据失败:', error);
      throw new Error('导入会议数据失败');
    }
  }

  /**
   * 检查localStorage是否可用
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
   * 获取本地存储的版本信息
   */
  static getStoredVersion(): string | null {
    try {
      if (!this.isLocalStorageAvailable()) {
        console.warn('localStorage不可用，使用内存存储');
        return null;
      }
      return localStorage.getItem(VERSION_STORAGE_KEY);
    } catch (error) {
      console.warn('获取版本信息失败:', error);
      return null;
    }
  }

  /**
   * 设置本地存储的版本信息
   */
  static setStoredVersion(version: string): void {
    try {
      if (!this.isLocalStorageAvailable()) {
        console.warn('localStorage不可用，跳过版本信息存储');
        return;
      }
      localStorage.setItem(VERSION_STORAGE_KEY, version);
    } catch (error) {
      console.warn('设置版本信息失败:', error);
    }
  }

  /**
   * 从本地JSON文件加载数据
   */
  static async loadMeetingsFromFile(): Promise<void> {
    try {
      // iOS Safari兼容性：添加缓存控制和超时处理
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      try {
        // 在实际应用中，这里会从服务器或本地文件加载数据
        // 现在我们使用fetch从public目录加载
        const response = await fetch('/io_connect_china_2025_workshops.json', {
          signal: controller.signal,
          cache: 'no-cache', // iOS Safari缓存问题
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: 无法加载会议数据文件`);
        }
        
        // iOS Safari JSON解析兼容性处理
        let jsonData;
        try {
          const textData = await response.text();
          if (!textData || textData.trim() === '') {
            throw new Error('JSON文件为空');
          }
          jsonData = JSON.parse(textData);
        } catch (parseError) {
          console.error('JSON解析失败:', parseError);
          throw new Error('JSON数据格式错误');
        }
        
        // 检查是否为新格式（包含版本信息）
        if (jsonData && typeof jsonData === 'object' && jsonData.version && jsonData.meetings) {
          const meetingData: MeetingDataVersion = jsonData;
          if (Array.isArray(meetingData.meetings) && meetingData.meetings.length > 0) {
            await this.importMeetingsFromJSON(meetingData.meetings);
            // 更新本地版本信息
            this.setStoredVersion(meetingData.version);
            console.log(`数据版本: ${meetingData.version}, 更新时间: ${meetingData.lastUpdated}`);
          } else {
            throw new Error('会议数据为空或格式错误');
          }
        } else {
          // 兼容旧格式
          const meetings: RawMeetingData[] = Array.isArray(jsonData) ? jsonData : [];
          if (meetings.length === 0) {
            throw new Error('会议数据为空');
          }
          await this.importMeetingsFromJSON(meetings);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('加载会议数据超时');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('加载会议数据文件失败:', error);
      // iOS Safari特定错误处理
      if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络设置');
      }
      throw new Error(`加载会议数据失败: ${error.message}`);
    }
  }

  /**
   * 检查数据库是否已初始化
   */
  static async isDatabaseInitialized(): Promise<boolean> {
    try {
      const meetings = await DatabaseService.getAllMeetings();
      return meetings.length > 0;
    } catch (error) {
      console.log(error)
      return false;
    }
  }

  /**
   * 检查是否需要更新数据
   */
  static async checkForDataUpdate(): Promise<boolean> {
    try {
      // iOS Safari兼容性：添加超时和缓存控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      
      try {
        const response = await fetch('/io_connect_china_2025_workshops.json', {
          signal: controller.signal,
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn('检查更新时无法获取数据文件');
          return false;
        }
        
        let jsonData;
        try {
          const textData = await response.text();
          jsonData = JSON.parse(textData);
        } catch (parseError) {
          console.warn('检查更新时JSON解析失败:', parseError);
          return false;
        }
        
        // 如果JSON文件包含版本信息
        if (jsonData && jsonData.version) {
          const storedVersion = this.getStoredVersion();
          return storedVersion !== jsonData.version;
        }
        
        return false;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn('检查数据更新超时');
        } else {
          console.warn('检查数据更新网络错误:', fetchError);
        }
        return false;
      }
    } catch (error) {
      console.error('检查数据更新失败:', error);
      return false;
    }
  }

  /**
   * 初始化应用数据
   */
  static async initializeAppData(): Promise<void> {
    try {
      const isInitialized = await this.isDatabaseInitialized();
      
      if (!isInitialized) {
        console.log('首次启动，正在初始化数据...');
        await this.loadMeetingsFromFile();
        console.log('数据初始化完成');
      } else {
        // 检查是否需要更新数据
        const needsUpdate = await this.checkForDataUpdate();
        if (needsUpdate) {
          console.log('检测到数据更新，正在重新加载...');
          await this.loadMeetingsFromFile();
          console.log('数据更新完成');
        } else {
          console.log('数据库已是最新版本，跳过数据导入');
        }
      }
    } catch (error) {
      console.error('初始化应用数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取会议统计信息
   */
  static async getMeetingStats(): Promise<{
    totalMeetings: number;
    categoriesCount: Record<string, number>;
    datesCount: Record<string, number>;
  }> {
    try {
      const meetings = await DatabaseService.getAllMeetings();
      
      const categoriesCount: Record<string, number> = {};
      const datesCount: Record<string, number> = {};
      
      meetings.forEach(meeting => {
        // 统计分类
        const category = meeting.专场.split(' | ')[0]; // 提取分类部分
        categoriesCount[category] = (categoriesCount[category] || 0) + 1;
        
        // 统计日期
        datesCount[meeting.日期] = (datesCount[meeting.日期] || 0) + 1;
      });
      
      return {
        totalMeetings: meetings.length,
        categoriesCount,
        datesCount
      };
    } catch (error) {
      console.error('获取会议统计信息失败:', error);
      return {
        totalMeetings: 0,
        categoriesCount: {},
        datesCount: {}
      };
    }
  }

  /**
   * 重新导入数据（用于数据更新）
   */
  static async reimportData(): Promise<void> {
    try {
      console.log('正在重新导入数据...');
      await this.loadMeetingsFromFile();
      console.log('数据重新导入完成');
    } catch (error) {
      console.error('重新导入数据失败:', error);
      throw error;
    }
  }
}