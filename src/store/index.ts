import { create } from 'zustand';
import { Meeting, Booking, Reminder, UserPreferences, MeetingFilter } from '../types';
import { DatabaseService } from '../lib/database';

// 应用状态接口
interface AppState {
  // 用户信息
  currentUserId: string;
  
  // 会议数据
  meetings: Meeting[];
  filteredMeetings: Meeting[];
  selectedMeeting: Meeting | null;
  
  // 用户预约
  userBookings: Booking[];
  
  // 提醒设置
  userReminders: Reminder[];
  
  // 用户偏好
  userPreferences: UserPreferences | null;
  
  // 筛选条件
  currentFilter: MeetingFilter;
  
  // UI状态
  loading: boolean;
  error: string | null;
  
  // Actions
  initializeApp: () => Promise<void>;
  loadMeetings: () => Promise<void>;
  filterMeetings: (filter: MeetingFilter) => void;
  selectMeeting: (meeting: Meeting | null) => void;
  
  // 预约相关
  bookMeeting: (meetingId: string) => Promise<Booking | null>;
  cancelBooking: (meetingId: string) => Promise<void>;
  loadUserBookings: () => Promise<void>;
  
  // 提醒相关
  addReminder: (meetingId: string, minutesBefore: number) => Promise<void>;
  updateReminder: (reminderId: string, updates: Partial<Reminder>) => Promise<void>;
  removeReminder: (reminderId: string) => Promise<void>;
  loadUserReminders: () => Promise<void>;
  
  // 用户偏好
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  loadUserPreferences: () => Promise<void>;
  
  // 工具方法
  checkConflicts: (meetingId: string) => Promise<Meeting[]>;
  clearAllData: () => Promise<void>;
  importMeetingsFromJson: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 别名属性
  bookings: Booking[];
}

// 创建store
export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  currentUserId: 'default-user',
  meetings: [],
  filteredMeetings: [],
  selectedMeeting: null,
  userBookings: [],
  userReminders: [],
  userPreferences: null,
  currentFilter: {},
  loading: false,
  error: null,
  bookings: [],

  // 初始化应用
  initializeApp: async () => {
    set({ loading: true, error: null });
    try {
      await get().loadMeetings();
      await get().loadUserBookings();
      await get().loadUserReminders();
      await get().loadUserPreferences();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '初始化失败' });
    } finally {
      set({ loading: false });
    }
  },

  // 加载会议数据
  loadMeetings: async () => {
    try {
      const meetings = await DatabaseService.getAllMeetings();
      set({ meetings, filteredMeetings: meetings });
    } catch (error) {
      console.log(error)
      set({ error: error instanceof Error ? error.message : '加载会议数据失败' });
    }
  },

  // 筛选会议
  filterMeetings: (filter: MeetingFilter) => {
    const { meetings } = get();
    let filtered = [...meetings];

    // 按分类筛选
    if (filter.category) {
      filtered = filtered.filter(meeting => 
        meeting.专场.toLowerCase().includes(filter.category!.toLowerCase())
      );
    }

    // 按日期筛选
    if (filter.date) {
      filtered = filtered.filter(meeting => meeting.日期 === filter.date);
    }

    // 按时段筛选
    if (filter.timeSlot) {
      filtered = filtered.filter(meeting => {
        const startTime = meeting.开始时间;
        const [hours] = startTime.split(':').map(Number);
        
        switch (filter.timeSlot) {
          case '上午':
            return hours >= 6 && hours < 12;
          case '下午':
            return hours >= 12 && hours < 18;
          case '晚上':
            return hours >= 18 || hours < 6;
          default:
            return true;
        }
      });
    }

    // 按搜索文本筛选
    if (filter.searchText) {
      const searchText = filter.searchText.toLowerCase();
      filtered = filtered.filter(meeting => 
        meeting.标题.toLowerCase().includes(searchText) ||
        meeting.简介?.toLowerCase().includes(searchText) ||
        meeting.嘉宾.some(guest => guest.姓名.toLowerCase().includes(searchText))
      );
    }

    set({ filteredMeetings: filtered, currentFilter: filter });
  },

  // 选择会议
  selectMeeting: (meeting: Meeting | null) => {
    set({ selectedMeeting: meeting });
  },

  // 预约会议
  bookMeeting: async (meetingId: string) => {
    const { currentUserId } = get();
    try {
      // 检查时间冲突
      const meeting = await DatabaseService.getMeetingById(meetingId);
      if (!meeting) throw new Error('会议不存在');

      // 检查是否已预约
      const existingBooking = await DatabaseService.getBookingByMeetingId(currentUserId, meetingId);
      if (existingBooking) {
        set({ error: '您已经预约了这个会议' });
        return null;
      }

      // 创建预约
      const booking: Booking = {
        id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUserId,
        meetingId,
        bookedAt: new Date(),
        status: 'confirmed'
      };

      await DatabaseService.addBooking(booking);
      await get().loadUserBookings();
      
      // 自动创建提醒
      const preferences = get().userPreferences;
      if (preferences?.notificationEnabled) {
        await get().addReminder(meetingId, preferences.defaultReminderTime);
      }
      
      return booking;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '预约失败' });
      return null;
    }
  },

  // 取消预约
  cancelBooking: async (meetingId: string) => {
    const { currentUserId } = get();
    try {
      const booking = await DatabaseService.getBookingByMeetingId(currentUserId, meetingId);
      if (booking) {
        await DatabaseService.removeBooking(booking.id);
        await get().loadUserBookings();
        
        // 删除相关提醒
        const reminders = get().userReminders.filter(r => r.meetingId === meetingId);
        for (const reminder of reminders) {
          await DatabaseService.removeReminder(reminder.id);
        }
        await get().loadUserReminders();
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '取消预约失败' });
    }
  },

  // 加载用户预约
  loadUserBookings: async () => {
    const { currentUserId } = get();
    try {
      const bookings = await DatabaseService.getUserBookings(currentUserId);
      set({ userBookings: bookings, bookings });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载预约数据失败' });
    }
  },

  // 添加提醒
  addReminder: async (meetingId: string, minutesBefore: number) => {
    const { currentUserId } = get();
    try {
      const reminder: Reminder = {
        id: `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUserId,
        meetingId,
        minutesBefore,
        enabled: true,
        notificationType: 'browser'
      };
      
      await DatabaseService.addReminder(reminder);
      await get().loadUserReminders();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '添加提醒失败' });
    }
  },

  // 更新提醒
  updateReminder: async (reminderId: string, updates: Partial<Reminder>) => {
    try {
      await DatabaseService.updateReminder(reminderId, updates);
      await get().loadUserReminders();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新提醒失败' });
    }
  },

  // 删除提醒
  removeReminder: async (reminderId: string) => {
    try {
      await DatabaseService.removeReminder(reminderId);
      await get().loadUserReminders();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除提醒失败' });
    }
  },

  // 加载用户提醒
  loadUserReminders: async () => {
    const { currentUserId } = get();
    try {
      const reminders = await DatabaseService.getUserReminders(currentUserId);
      set({ userReminders: reminders });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载提醒数据失败' });
    }
  },

  // 更新用户偏好
  updateUserPreferences: async (updates: Partial<UserPreferences>) => {
    const { currentUserId, userPreferences } = get();
    try {
      const newPreferences: UserPreferences = {
        userId: currentUserId,
        interests: [],
        defaultReminderTime: 15,
        notificationEnabled: true,
        enableSound: true,
        enableVibration: true,
        theme: 'auto',
        language: 'zh-CN',
        pageSize: 10,
        ...userPreferences,
        ...updates
      };
      
      await DatabaseService.saveUserPreferences(newPreferences);
      set({ userPreferences: newPreferences });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新偏好设置失败' });
    }
  },

  // 加载用户偏好
  loadUserPreferences: async () => {
    const { currentUserId } = get();
    try {
      let preferences = await DatabaseService.getUserPreferences(currentUserId);
      
      // 如果没有偏好设置，创建默认设置
      if (!preferences) {
        preferences = {
          userId: currentUserId,
          interests: [],
          defaultReminderTime: 15,
          notificationEnabled: true,
          enableSound: true,
          enableVibration: true,
          theme: 'auto',
          language: 'zh-CN',
          pageSize: 10
        };
        await DatabaseService.saveUserPreferences(preferences);
      }
      
      set({ userPreferences: preferences });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载偏好设置失败' });
    }
  },

  // 检查冲突
  checkConflicts: async (meetingId: string) => {
    const { currentUserId } = get();
    try {
      const meeting = await DatabaseService.getMeetingById(meetingId);
      if (!meeting) return [];
      
      return await DatabaseService.checkTimeConflicts(currentUserId, meeting);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '检查冲突失败' });
      return [];
    }
  },

  // 设置加载状态
  setLoading: (loading: boolean) => {
    set({ loading });
  },

  // 设置错误信息
  setError: (error: string | null) => {
    set({ error });
  },

  // 清除所有数据
  clearAllData: async () => {
    try {
      await DatabaseService.clearAllData();
      set({
        meetings: [],
        filteredMeetings: [],
        selectedMeeting: null,
        userBookings: [],
        userReminders: [],
        userPreferences: null,
        currentFilter: {},
        error: null
      });
    } catch (error) {
       set({ error: error instanceof Error ? error.message : '清除数据失败' });
     }
   },

  // 重新导入会议数据
  importMeetingsFromJson: async () => {
    set({ loading: true, error: null });
    try {
      await DatabaseService.importMeetingsFromJson();
      await get().loadMeetings();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '导入会议数据失败' });
    } finally {
      set({ loading: false });
    }
  }
}));