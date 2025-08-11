import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Tag, 
  Button, 
  Empty, 
  Tabs,
  SwipeAction,
  Modal,
  Toast,
} from 'antd-mobile';
import { 
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../store';
import { Meeting } from '../types';
import Layout from '../components/Layout';
import MeetingCard from '../components/MeetingCard';

const MySchedule = () => {
  const navigate = useNavigate();
  const { 
    meetings, 
    bookings, 
    cancelBooking, 
    checkConflicts 
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState('all');
  const [conflicts, setConflicts] = useState<{ meeting: Meeting; conflictingMeeting: Meeting }[]>([]);

  // 获取已预约的会议
  const bookedMeetings = useMemo(() => {
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    return confirmedBookings.map(booking => {
      const meeting = meetings.find(m => m.id === booking.meetingId);
      return meeting ? { ...meeting, bookingId: booking.id } : null;
    }).filter(Boolean) as (Meeting & { bookingId: string })[];
  }, [meetings, bookings]);

  // 按日期分组的会议
  const meetingsByDate = useMemo(() => {
    const grouped: { [date: string]: (Meeting & { bookingId: string })[] } = {};
    bookedMeetings.forEach(meeting => {
      if (!grouped[meeting.日期]) {
        grouped[meeting.日期] = [];
      }
      grouped[meeting.日期].push(meeting);
    });
    
    // 按时间排序每一天的会议
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.开始时间.localeCompare(b.开始时间));
    });
    
    return grouped;
  }, [bookedMeetings]);

  // 检查冲突
  useEffect(() => {
    const checkAllConflicts = async () => {
      const allConflicts: { meeting: Meeting; conflictingMeeting: Meeting }[] = [];
      
      for (const meeting of bookedMeetings) {
        const conflictingMeetings = await checkConflicts(meeting.id);
        conflictingMeetings.forEach(conflictingMeeting => {
          allConflicts.push({ meeting, conflictingMeeting });
        });
      }
      
      // 去重（因为A与B冲突，B与A也冲突）
      const uniqueConflicts = allConflicts.filter((conflict, index, arr) => {
        return arr.findIndex(c => 
          (c.meeting.id === conflict.meeting.id && c.conflictingMeeting.id === conflict.conflictingMeeting.id) ||
          (c.meeting.id === conflict.conflictingMeeting.id && c.conflictingMeeting.id === conflict.meeting.id)
        ) === index;
      });
      
      setConflicts(uniqueConflicts);
    };
    
    if (bookedMeetings.length > 0) {
      checkAllConflicts();
    } else {
      setConflicts([]);
    }
  }, [bookedMeetings, checkConflicts]);

  // 获取今天的会议
  const todayMeetings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return meetingsByDate[today] || [];
  }, [meetingsByDate]);

  // 获取即将到来的会议（未来7天）
  const upcomingMeetings = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return bookedMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.日期);
      return meetingDate >= today && meetingDate <= nextWeek;
    }).sort((a, b) => {
      const dateCompare = a.日期.localeCompare(b.日期);
      if (dateCompare === 0) {
        return a.开始时间.localeCompare(b.开始时间);
      }
      return dateCompare;
    });
  }, [bookedMeetings]);

  // 处理取消预约
  const handleCancelBooking = async (meetingId: string, meetingTitle: string) => {
    const result = await Modal.confirm({
      title: '确认取消预约',
      content: `确定要取消预约「${meetingTitle}」吗？`,
    });
    
    if (result) {
      try {
        await cancelBooking(meetingId);
        Toast.show('已取消预约');
      } catch (error) {
        Toast.show('取消失败，请重试');
        console.error(error)
      }
    }
  };

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 周${weekday}`;
  };

  // 检查是否是今天
  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  // 渲染会议列表
  const renderMeetingList = (meetings: (Meeting & { bookingId: string })[]) => {
    if (meetings.length === 0) {
      return (
        <Empty
          description="暂无预约的会议"
          style={{ padding: '64px 0' }}
        />
      );
    }

    return (
      <div className="space-y-3">
        {meetings.map((meeting) => (
          <SwipeAction
            key={meeting.id}
            rightActions={[
              {
                key: 'view',
                text: '查看',
                color: 'primary',
                onClick: () => navigate(`/meeting/${meeting.id}`)
              },
              {
                key: 'cancel',
                text: '取消',
                color: 'danger',
                onClick: () => handleCancelBooking(meeting.id, meeting.标题)
              }
            ]}
          >
            <MeetingCard
              meeting={meeting}
              onClick={() => navigate(`/meeting/${meeting.id}`)}
              showBookingStatus={false}
            />
          </SwipeAction>
        ))}
      </div>
    );
  };

  // 渲染按日期分组的会议
  const renderMeetingsByDate = () => {
    const dates = Object.keys(meetingsByDate).sort();
    
    if (dates.length === 0) {
      return (
        <Empty
          description="暂无预约的会议"
          style={{ padding: '64px 0' }}
        />
      );
    }

    return (
      <div className="space-y-6">
        {dates.map(date => (
          <div key={date}>
            <div className="flex items-center mb-3">
              <Calendar size={20} className="mr-2 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {formatDate(date)}
                {isToday(date) && (
                  <Tag color="primary" className="ml-2">今天</Tag>
                )}
              </h3>
            </div>
            
            <div className="space-y-3">
              {meetingsByDate[date].map((meeting) => (
                <SwipeAction
                  key={meeting.id}
                  rightActions={[
                    {
                      key: 'view',
                      text: '查看',
                      color: 'primary',
                      onClick: () => navigate(`/meeting/${meeting.id}`)
                    },
                    {
                      key: 'cancel',
                      text: '取消',
                      color: 'danger',
                      onClick: () => handleCancelBooking(meeting.id, meeting.标题)
                    }
                  ]}
                >
                  <MeetingCard
                    meeting={meeting}
                    onClick={() => navigate(`/meeting/${meeting.id}`)}
                    showBookingStatus={false}
                  />
                </SwipeAction>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染冲突列表
  const renderConflicts = () => {
    if (conflicts.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-green-500 text-4xl mb-4">✓</div>
          <p className="text-gray-600">太好了！没有时间冲突</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
          <div className="flex items-center text-orange-600 dark:text-orange-400 mb-2">
            <AlertTriangle size={20} className="mr-2" />
            <span className="font-medium">发现 {conflicts.length} 个时间冲突</span>
          </div>
          <p className="text-sm text-orange-700 dark:text-orange-300">
            建议您重新安排行程或取消部分会议预约
          </p>
        </div>

        {conflicts.map((conflict, index) => (
          <Card key={index} className="border-l-4 border-l-orange-400">
            <div className="space-y-3">
              <div className="text-sm text-gray-500 font-medium">
                冲突 #{index + 1}
              </div>
              
              <div className="space-y-2">
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <div className="font-medium text-gray-800 dark:text-gray-100">
                    {conflict.meeting.标题}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {formatDate(conflict.meeting.日期)} {' '}
                    {conflict.meeting.开始时间} - {conflict.meeting.结束时间}
                  </div>
                </div>
                    <div className="space-y-2">
                {/* 第一个会议的操作按钮 */}
                <div className="flex space-x-2">
                  <Button
                    size="small"
                    fill="outline"
                    onClick={() => navigate(`/meeting/${conflict.meeting.id}`)}
                  >
                    查看详情
                  </Button>
                  <Button
                    size="small"
                    color="danger"
                    fill="outline"
                    onClick={() => handleCancelBooking(conflict.meeting.id, conflict.meeting.标题)}
                  >
                    取消预约
                  </Button>
                </div>
              </div>
                
                <div className="text-center text-gray-400 text-sm">
                  与
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <div className="font-medium text-gray-800 dark:text-gray-100">
                    {conflict.conflictingMeeting.标题}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {formatDate(conflict.conflictingMeeting.日期)} {' '}
                    {conflict.conflictingMeeting.开始时间} - {conflict.conflictingMeeting.结束时间}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                {/* 第二个会议的操作按钮 */}
                <div className="flex space-x-2">
                  <Button
                    size="small"
                    fill="outline"
                    onClick={() => navigate(`/meeting/${conflict.conflictingMeeting.id}`)}
                  >
                    查看详情
                  </Button>
                  <Button
                    size="small"
                    color="danger"
                    fill="outline"
                    onClick={() => handleCancelBooking(conflict.conflictingMeeting.id, conflict.conflictingMeeting.标题)}
                  >
                    取消预约
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const tabs = [
    { key: 'today', title: `今天 (${todayMeetings.length})` },
    { key: 'upcoming', title: `即将到来 (${upcomingMeetings.length})` },
    { key: 'all', title: `全部 (${bookedMeetings.length})` },
    { key: 'conflicts', title: `冲突 (${conflicts.length})` }
  ];

  return (
    <Layout>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* 头部 */}
        <div className="bg-white dark:bg-gray-800 sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              我的行程
            </h1>
            
            {/* 统计信息 */}
            <div className="mt-3 flex space-x-4 text-sm">
              <div className="text-gray-600 dark:text-gray-300">
                <span className="font-medium text-blue-600 dark:text-blue-400">{bookedMeetings.length}</span> 个已预约
              </div>
              {conflicts.length > 0 && (
                <div className="text-orange-600 dark:text-orange-400">
                  <span className="font-medium">{conflicts.length}</span> 个冲突
                </div>
              )}
            </div>
          </div>

          {/* 标签页 */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="bg-white dark:bg-gray-800"
          >
            {tabs.map(tab => (
              <Tabs.Tab title={tab.title} key={tab.key} />
            ))}
          </Tabs>
        </div>

        {/* 内容区域 */}
        <div className="p-4">
          {activeTab === 'today' && renderMeetingList(todayMeetings)}
          {activeTab === 'upcoming' && renderMeetingList(upcomingMeetings)}
          {activeTab === 'all' && renderMeetingsByDate()}
          {activeTab === 'conflicts' && renderConflicts()}
        </div>

        {/* 底部提示 */}
        {bookedMeetings.length > 0 && (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            左滑会议卡片可以查看详情或取消预约
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MySchedule;