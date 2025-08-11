// JSON数据版本控制类型定义
export interface MeetingDataVersion {
  version: string;
  lastUpdated: string;
  meetings: Meeting[];
}

// 会议数据类型定义
export interface Meeting {
  id: string;
  标题: string;
  专场: string;
  日期: string;
  开始时间: string;
  结束时间: string;
  时段: string;
  简介: string | null;
  嘉宾: Guest[];
}

export interface Guest {
  姓名: string;
  头衔: string;
}

// 用户预约类型定义
export interface Booking {
  id: string;
  userId: string;
  meetingId: string;
  bookedAt: Date;
  status: 'confirmed' | 'cancelled' | 'conflict';
}

// 提醒设置类型定义
export interface Reminder {
  id: string;
  userId: string;
  meetingId: string;
  minutesBefore: number;
  enabled: boolean;
  notificationType: 'browser' | 'sound' | 'vibration';
}

// 用户偏好设置类型定义
export interface UserPreferences {
  userId: string;
  interests: string[];
  defaultReminderTime: number;
  notificationEnabled: boolean;
  enableSound: boolean;
  enableVibration: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  pageSize: number;
}

// 会议筛选类型定义
export interface MeetingFilter {
  category?: string;
  date?: string;
  difficulty?: string;
  searchText?: string;
  timeSlot?: string;
}

// 时间冲突检测结果
export interface ConflictResult {
  hasConflict: boolean;
  conflictingMeetings: Meeting[];
  suggestions: Meeting[];
}