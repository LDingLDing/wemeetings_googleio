import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  NavBar, 
  Card, 
  Tag, 
  Button, 
  Toast,
} from 'antd-mobile';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useAppStore } from '../store';
import { reminderService } from '../lib/reminderService';
import { Meeting, ConflictResult } from '../types';
import Layout from '../components/Layout';
import { trackMeetingEvent, trackPageView } from '../utils/analytics';

const MeetingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    meetings, 
    bookings, 
    bookMeeting, 
    cancelBooking, 
    checkConflicts 
  } = useAppStore();
  const { userPreferences } = useAppStore();
  const defaultReminderTime = userPreferences?.defaultReminderTime || 15;
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isBooked, setIsBooked] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictResult[]>([]);
  // 移除冲突弹窗相关状态
  const [loading, setLoading] = useState(false);

  // 加载会议详情
  useEffect(() => {
    const loadMeetingData = async () => {
      if (id) {
        const foundMeeting = meetings.find(m => m.id === id);
        if (foundMeeting) {
          setMeeting(foundMeeting);
          
          // 追踪页面浏览
          trackPageView(`会议详情 - ${foundMeeting.标题}`, `/meeting/${id}`);
          
          // 检查是否已预约
          const booking = bookings.find(b => 
            b.meetingId === id && b.status === 'confirmed'
          );
          setIsBooked(!!booking);
          
          // 检查时间冲突
          const conflictingMeetings = await checkConflicts(foundMeeting.id);
          if (conflictingMeetings.length > 0) {
            const conflictResult: ConflictResult = {
              hasConflict: true,
              conflictingMeetings,
              suggestions: []
            };
            setConflicts([conflictResult]);
          } else {
            setConflicts([]);
          }
        } else {
          Toast.show('会议不存在');
          navigate('/');
        }
      }
    };
    
    loadMeetingData();
  }, [id, meetings, bookings, checkConflicts, navigate]);

  // 处理预约
  const handleBooking = async () => {
    if (!meeting) return;
    
    setLoading(true);
    
    try {
      if (isBooked) {
        // 取消预约
        await cancelBooking(meeting.id);
        setIsBooked(false);
        
        // 取消会议提醒
        reminderService.cancelMeetingReminders(meeting.id);
        
        // 追踪取消预约事件
        trackMeetingEvent('cancel', meeting.id, {
          meeting_title: meeting.标题,
          meeting_category: meeting.专场,
          meeting_date: meeting.日期
        });
        
        Toast.show('已取消预约和提醒');
      } else {
        // 直接预约会议，不显示冲突确认弹窗
        const booking = await bookMeeting(meeting.id);
        setIsBooked(true);
        
        // 安排会议提醒
        if (booking) {
          reminderService.scheduleMultipleReminders(
            meeting,
            booking,
            [defaultReminderTime, 5] // 默认提醒时间和5分钟前提醒
          );
        }
        
        // 追踪预约事件
        trackMeetingEvent('book', meeting.id, {
          meeting_title: meeting.标题,
          meeting_category: meeting.专场,
          meeting_date: meeting.日期,
          has_conflict: conflicts.length > 0,
          conflict_count: conflicts.length
        });
        
        if (conflicts.length > 0) {
          Toast.show('预约成功，已设置提醒，请注意时间冲突');
        } else {
          Toast.show('预约成功，已设置提醒');
        }
      }
    } catch (error) {
      Toast.show('操作失败，请重试');
      console.error(error)
    } finally {
      setLoading(false);
    }
  };

  // 移除强制预约函数

  // 格式化时间显示
  const formatTime = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日 周${weekday}`;
  };

  // 获取分类颜色
  const getCategoryColor = (category: string) => {
    const colors = {
      'AI': '#1890ff',
      'Android': '#52c41a',
      'Web': '#722ed1',
      'Cloud': '#fa8c16',
      'Flutter': '#13c2c2',
      'Firebase': '#f5222d',
      'Chrome': '#faad14',
      'Assistant': '#eb2f96',
      'Gemini': '#2f54eb'
    };
    
    for (const [key, color] of Object.entries(colors)) {
      if (category.includes(key)) {
        return color;
      }
    }
    return '#666666';
  };

  if (!meeting) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <span className="text-gray-500">加载中...</span>
        </div>
      </Layout>
    );
  }

  const [mainCategory, subCategory] = meeting.专场.split(' | ');

  return (
    <Layout>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-16">
        {/* 导航栏 */}
        <NavBar
          back="返回"
          onBack={() => navigate(-1)}
          className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        >
          <span className="text-gray-800 dark:text-gray-200">会议详情</span>
        </NavBar>

        <div className="p-4 space-y-4">
          {/* 会议基本信息 */}
          <Card className="shadow-sm">
            <div className="space-y-4">
              {/* 标题和状态 */}
              <div className="flex justify-between items-start">
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 leading-tight flex-1 mr-4">
                  {meeting.标题}
                </h1>
                {isBooked && (
                  <Tag color="success" className="shrink-0">
                    <CheckCircle className="mr-1" />
                    已预约
                  </Tag>
                )}
              </div>

              {/* 分类标签 */}
              <div className="flex flex-wrap gap-2">
                <Tag color={getCategoryColor(mainCategory)}>
                  {mainCategory}
                </Tag>
                {subCategory && (
                  <Tag color="default">
                    {subCategory}
                  </Tag>
                )}
              </div>

              {/* 时间信息 */}
              <div className="space-y-3">
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <Calendar className="mr-3 text-blue-500 dark:text-blue-400 text-lg" />
                  <span className="font-medium">{formatDate(meeting.日期)}</span>
                </div>
                
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <Clock className="mr-3 text-green-500 dark:text-green-400 text-lg" />
                  <span className="font-medium">
                    {formatTime(meeting.开始时间, meeting.结束时间)}
                  </span>
                  <Tag color="primary" className="ml-3">
                    {meeting.时段}
                  </Tag>
                </div>
              </div>

              {/* 冲突提示 */}
              {conflicts.length > 0 && !isBooked && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center text-orange-600 mb-2">
                    <AlertTriangle className="mr-2" />
                    <span className="font-medium">时间冲突提醒</span>
                  </div>
                  <p className="text-sm text-orange-700">
                    该会议与您已预约的 {conflicts.length} 个会议时间冲突
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* 讲师信息 */}
          {meeting.嘉宾 && meeting.嘉宾.length > 0 && (
            <Card className="shadow-sm">
              <div className="space-y-3">
                  <div className="flex items-center">
                    <User className="mr-2 text-purple-500 dark:text-purple-400 text-lg" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                      讲师介绍
                    </h3>
                  </div>
                
                <div className="space-y-3">
                  {meeting.嘉宾.map((guest, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div 
                        className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold"
                      >
                        {guest.姓名.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                          {guest.姓名}
                        </h4>
                        {guest.头衔 && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {guest.头衔}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* 会议简介 */}
          {meeting.简介 && (
            <Card className="shadow-sm">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  会议简介
                </h3>
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {meeting.简介}
                </div>
              </div>
            </Card>
          )}

          {/* 预约按钮 */}
          <div className="sticky bottom-20 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 rounded-t-lg shadow-lg">
            <Button
              color={isBooked ? 'danger' : 'primary'}
              size="large"
              block
              loading={loading}
              onClick={handleBooking}
            >
              {isBooked ? '取消预约' : '立即预约'}
            </Button>
          </div>
        </div>

        {/* 移除冲突确认弹窗 */}
      </div>
    </Layout>
  );
};

export default MeetingDetail;