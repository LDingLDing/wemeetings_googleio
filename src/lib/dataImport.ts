import { Meeting } from '../types';
import { DatabaseService } from './database';

// 原始JSON数据接口
interface RawMeetingData {
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

export class DataImportService {
  /**
   * 从JSON文件导入会议数据
   */
  static async importMeetingsFromJSON(jsonData: RawMeetingData[]): Promise<void> {
    try {
      // 清空现有数据
      await DatabaseService.clearMeetings();
      
      // 转换数据格式并生成ID
      const meetings: Meeting[] = jsonData.map((rawMeeting, index) => ({
        id: `meeting-${index + 1}`,
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
   * 从本地JSON文件加载数据
   */
  static async loadMeetingsFromFile(): Promise<void> {
    try {
      // 在实际应用中，这里会从服务器或本地文件加载数据
      // 现在我们使用fetch从public目录加载
      const response = await fetch('/io_connect_china_2025_workshops.json');
      if (!response.ok) {
        throw new Error('无法加载会议数据文件');
      }
      
      const jsonData: RawMeetingData[] = await response.json();
      await this.importMeetingsFromJSON(jsonData);
    } catch (error) {
      console.error('加载会议数据文件失败:', error);
      throw new Error('加载会议数据文件失败');
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
        console.log('数据库已初始化，跳过数据导入');
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