import { pwaService } from './pwa';
import { Meeting, Booking, UserPreferences } from '../types';

// 提醒任务接口
interface ReminderTask {
  id: string;
  meetingId: string;
  meetingTitle: string;
  meetingTime: Date;
  reminderTime: Date;
  reminderMinutes: number;
  timeoutId?: number;
}

// 会议提醒调度服务
export class ReminderService {
  private static instance: ReminderService;
  private reminderTasks: Map<string, ReminderTask> = new Map();
  private userPreferences: UserPreferences | null = null;

  private constructor() {
    // 监听页面可见性变化，恢复提醒任务
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.restoreReminderTasks();
      }
    });
  }

  public static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  // 设置用户偏好
  public setUserPreferences(preferences: UserPreferences): void {
    this.userPreferences = preferences;
  }

  // 为会议安排提醒
  public scheduleReminder(
    meeting: Meeting,
    booking: Booking,
    reminderMinutes: number = 15
  ): void {
    if (!this.userPreferences?.notificationEnabled) {
      return;
    }

    const meetingTime = new Date(`${meeting.日期} ${meeting.开始时间}`);
    const reminderTime = new Date(meetingTime.getTime() - reminderMinutes * 60 * 1000);
    const now = new Date();

    // 如果提醒时间已过，不安排提醒
    if (reminderTime <= now) {
      return;
    }

    const taskId = `${meeting.id}-${reminderMinutes}`;
    const delay = reminderTime.getTime() - now.getTime();

    // 清除已存在的相同提醒任务
    this.cancelReminder(taskId);

    const timeoutId = window.setTimeout(async () => {
      await this.sendReminder(meeting, reminderMinutes);
      this.reminderTasks.delete(taskId);
    }, delay);

    const task: ReminderTask = {
      id: taskId,
      meetingId: meeting.id,
      meetingTitle: meeting.标题,
      meetingTime,
      reminderTime,
      reminderMinutes,
      timeoutId
    };

    this.reminderTasks.set(taskId, task);
    
    // 保存到本地存储
    this.saveReminderTasks();
  }

  // 为预约的会议安排多个提醒
  public scheduleMultipleReminders(
    meeting: Meeting,
    booking: Booking,
    reminderMinutes: number[] = [15, 5]
  ): void {
    reminderMinutes.forEach(minutes => {
      this.scheduleReminder(meeting, booking, minutes);
    });
  }

  // 取消提醒
  public cancelReminder(taskId: string): void {
    const task = this.reminderTasks.get(taskId);
    if (task && task.timeoutId) {
      clearTimeout(task.timeoutId);
      this.reminderTasks.delete(taskId);
      this.saveReminderTasks();
    }
  }

  // 取消会议的所有提醒
  public cancelMeetingReminders(meetingId: string): void {
    const tasksToCancel = Array.from(this.reminderTasks.values())
      .filter(task => task.meetingId === meetingId);
    
    tasksToCancel.forEach(task => {
      this.cancelReminder(task.id);
    });
  }

  // 发送提醒通知
  private async sendReminder(meeting: Meeting, reminderMinutes: number): Promise<void> {
    try {
      const meetingTime = new Date(`${meeting.日期} ${meeting.开始时间}`).toLocaleString('zh-CN', {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      await pwaService.sendMeetingReminder(
        meeting.标题,
        meetingTime,
        reminderMinutes,
        {
          enableSound: this.userPreferences?.enableSound,
          enableVibration: this.userPreferences?.enableVibration
        }
      );

      console.log(`已发送会议提醒: ${meeting.标题} (${reminderMinutes}分钟前)`);
    } catch (error) {
      console.error('发送会议提醒失败:', error);
    }
  }

  // 保存提醒任务到本地存储
  private saveReminderTasks(): void {
    try {
      const tasksData = Array.from(this.reminderTasks.values()).map(task => ({
        id: task.id,
        meetingId: task.meetingId,
        meetingTitle: task.meetingTitle,
        meetingTime: task.meetingTime.toISOString(),
        reminderTime: task.reminderTime.toISOString(),
        reminderMinutes: task.reminderMinutes
      }));
      
      localStorage.setItem('reminderTasks', JSON.stringify(tasksData));
    } catch (error) {
      console.error('保存提醒任务失败:', error);
    }
  }

  // 从本地存储恢复提醒任务
  private restoreReminderTasks(): void {
    try {
      const tasksData = localStorage.getItem('reminderTasks');
      if (!tasksData) return;

      const tasks = JSON.parse(tasksData);
      const now = new Date();

      tasks.forEach((taskData: ReminderTask) => {
        const reminderTime = new Date(taskData.reminderTime);
        const meetingTime = new Date(taskData.meetingTime);
        
        // 如果提醒时间已过但会议还没开始，立即发送提醒
        if (reminderTime <= now && meetingTime > now) {
          this.sendReminder({
            id: taskData.meetingId,
            标题: taskData.meetingTitle,
            startTime: taskData.meetingTime,
            日期: new Date(taskData.meetingTime).toISOString().split('T')[0],
            开始时间: new Date(taskData.meetingTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            结束时间: '',
            专场: '',
            简介: '',
            嘉宾: [],
            时段: ''
          } as Meeting, taskData.reminderMinutes);
        }
        // 如果提醒时间还没到，重新安排
        else if (reminderTime > now) {
          const delay = reminderTime.getTime() - now.getTime();
          const timeoutId = window.setTimeout(async () => {
            await this.sendReminder({
              id: taskData.meetingId,
              标题: taskData.meetingTitle,
              startTime: taskData.meetingTime,
              日期: new Date(taskData.meetingTime).toISOString().split('T')[0],
              开始时间: new Date(taskData.meetingTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
              结束时间: '',
              专场: '',
              简介: '',
              嘉宾: [],
              时段: ''
            } as Meeting, taskData.reminderMinutes);
            this.reminderTasks.delete(taskData.id);
          }, delay);

          const task: ReminderTask = {
            id: taskData.id,
            meetingId: taskData.meetingId,
            meetingTitle: taskData.meetingTitle,
            meetingTime,
            reminderTime,
            reminderMinutes: taskData.reminderMinutes,
            timeoutId
          };

          this.reminderTasks.set(taskData.id, task);
        }
      });

      // 清理过期的任务
      this.cleanupExpiredTasks();
    } catch (error) {
      console.error('恢复提醒任务失败:', error);
    }
  }

  // 清理过期的提醒任务
  private cleanupExpiredTasks(): void {
    const now = new Date();
    const expiredTasks: string[] = [];

    this.reminderTasks.forEach((task, taskId) => {
      // 如果会议时间已过，清理任务
      if (task.meetingTime <= now) {
        if (task.timeoutId) {
          clearTimeout(task.timeoutId);
        }
        expiredTasks.push(taskId);
      }
    });

    expiredTasks.forEach(taskId => {
      this.reminderTasks.delete(taskId);
    });

    if (expiredTasks.length > 0) {
      this.saveReminderTasks();
    }
  }

  // 获取活跃的提醒任务
  public getActiveReminders(): ReminderTask[] {
    return Array.from(this.reminderTasks.values());
  }

  // 获取会议的提醒任务
  public getMeetingReminders(meetingId: string): ReminderTask[] {
    return Array.from(this.reminderTasks.values())
      .filter(task => task.meetingId === meetingId);
  }

  // 清除所有提醒任务
  public clearAllReminders(): void {
    this.reminderTasks.forEach(task => {
      if (task.timeoutId) {
        clearTimeout(task.timeoutId);
      }
    });
    
    this.reminderTasks.clear();
    localStorage.removeItem('reminderTasks');
  }

  // 初始化服务
  public initialize(userPreferences: UserPreferences): void {
    this.setUserPreferences(userPreferences);
    this.restoreReminderTasks();
  }
}

// 导出单例实例
export const reminderService = ReminderService.getInstance();