import Dexie, { Table } from 'dexie';
import { Meeting, Booking, Reminder, UserPreferences } from '../types';

// 数据库类定义
export class MeetingDatabase extends Dexie {
  meetings!: Table<Meeting>;
  bookings!: Table<Booking>;
  reminders!: Table<Reminder>;
  userPreferences!: Table<UserPreferences>;

  constructor() {
    super('MeetingDatabase');
    
    this.version(1).stores({
      meetings: 'id, 标题, 专场, 日期, 开始时间, 结束时间',
      bookings: 'id, userId, meetingId, status, bookedAt',
      reminders: 'id, userId, meetingId, enabled',
      userPreferences: 'userId'
    });
  }
}

// 创建数据库实例
export const db = new MeetingDatabase();

// 数据库操作类
export class DatabaseService {
  // 会议相关操作
  static async getAllMeetings(): Promise<Meeting[]> {
    return await db.meetings.toArray();
  }

  static async getMeetingById(id: string): Promise<Meeting | undefined> {
    return await db.meetings.get(id);
  }

  static async getMeetingsByDate(date: string): Promise<Meeting[]> {
    return await db.meetings.where('日期').equals(date).toArray();
  }

  static async getMeetingsByCategory(category: string): Promise<Meeting[]> {
    return await db.meetings.where('专场').startsWithIgnoreCase(category).toArray();
  }

  static async searchMeetings(searchText: string): Promise<Meeting[]> {
    const meetings = await db.meetings.toArray();
    return meetings.filter(meeting => 
      meeting.标题.toLowerCase().includes(searchText.toLowerCase()) ||
      meeting.简介?.toLowerCase().includes(searchText.toLowerCase()) ||
      meeting.嘉宾.some(guest => guest.姓名.toLowerCase().includes(searchText.toLowerCase()))
    );
  }

  static async addMeetings(meetings: Meeting[]): Promise<void> {
    await db.meetings.bulkAdd(meetings);
  }

  static async clearMeetings(): Promise<void> {
    await db.meetings.clear();
  }

  static async importMeetingsFromJson(): Promise<void> {
    try {
      // 清除现有会议数据
      await this.clearMeetings();
      
      // 从public目录加载会议数据
      const response = await fetch('/io_connect_china_2025_workshops.json');
      if (!response.ok) {
        throw new Error('无法加载会议数据文件');
      }
      
      const meetingsData = await response.json();
      
      // 转换数据格式并添加ID
      const meetings: Meeting[] = meetingsData.map((meeting: Meeting, index: number) => ({
        id: `meeting-${index + 1}`,
        ...meeting
      }));
      
      // 批量添加会议数据
      await this.addMeetings(meetings);
    } catch (error) {
      throw new Error(`导入会议数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 预约相关操作
  static async getUserBookings(userId: string): Promise<Booking[]> {
    return await db.bookings.where('userId').equals(userId).toArray();
  }

  static async addBooking(booking: Booking): Promise<void> {
    await db.bookings.add(booking);
  }

  static async removeBooking(bookingId: string): Promise<void> {
    await db.bookings.delete(bookingId);
  }

  static async updateBookingStatus(bookingId: string, status: Booking['status']): Promise<void> {
    await db.bookings.update(bookingId, { status });
  }

  static async getBookingByMeetingId(userId: string, meetingId: string): Promise<Booking | undefined> {
    return await db.bookings.where({ userId, meetingId }).first();
  }

  // 提醒相关操作
  static async getUserReminders(userId: string): Promise<Reminder[]> {
    return await db.reminders.where('userId').equals(userId).toArray();
  }

  static async addReminder(reminder: Reminder): Promise<void> {
    await db.reminders.add(reminder);
  }

  static async updateReminder(reminderId: string, updates: Partial<Reminder>): Promise<void> {
    await db.reminders.update(reminderId, updates);
  }

  static async removeReminder(reminderId: string): Promise<void> {
    await db.reminders.delete(reminderId);
  }

  // 用户偏好相关操作
  static async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    return await db.userPreferences.get(userId);
  }

  static async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    await db.userPreferences.put(preferences);
  }

  // 时间冲突检测
  static async checkTimeConflicts(userId: string, newMeeting: Meeting): Promise<Meeting[]> {
    const userBookings = await this.getUserBookings(userId);
    const bookedMeetingIds = userBookings
      .filter(booking => booking.status === 'confirmed')
      .map(booking => booking.meetingId);
    
    const bookedMeetings = await db.meetings.where('id').anyOf(bookedMeetingIds).toArray();
    
    return bookedMeetings.filter(meeting => {
      // 排除当前要预约的会议本身
      if (meeting.id === newMeeting.id) return false;
      if (meeting.日期 !== newMeeting.日期) return false;
      
      const newStart = this.timeToMinutes(newMeeting.开始时间);
      const newEnd = this.timeToMinutes(newMeeting.结束时间);
      const existingStart = this.timeToMinutes(meeting.开始时间);
      const existingEnd = this.timeToMinutes(meeting.结束时间);
      
      return (newStart < existingEnd && newEnd > existingStart);
    });
  }

  // 辅助方法：将时间字符串转换为分钟数
  private static timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // 获取推荐会议（基于用户兴趣）
  static async getRecommendedMeetings(userId: string): Promise<Meeting[]> {
    const preferences = await this.getUserPreferences(userId);
    if (!preferences || preferences.interests.length === 0) {
      return await this.getAllMeetings();
    }

    const allMeetings = await this.getAllMeetings();
    return allMeetings.filter(meeting => 
      preferences.interests.some(interest => 
        meeting.专场.toLowerCase().includes(interest.toLowerCase()) ||
        meeting.标题.toLowerCase().includes(interest.toLowerCase())
      )
    );
  }

  // 清除所有数据
  static async clearAllData(): Promise<void> {
    await db.meetings.clear();
    await db.bookings.clear();
    await db.reminders.clear();
    await db.userPreferences.clear();
  }
}