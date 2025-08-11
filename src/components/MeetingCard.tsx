import { Card, Tag, Space, Avatar } from 'antd-mobile';
import {
  Clock,
  MapPin,
  User,
  Calendar
} from 'lucide-react';
import { Meeting } from '../types';
import { useAppStore } from '../store';

interface MeetingCardProps {
  meeting: Meeting;
  onClick?: () => void;
  showBookingStatus?: boolean;
}

const MeetingCard = ({ meeting, onClick, showBookingStatus = true }: MeetingCardProps) => {
  const { bookings } = useAppStore();
  
  // 检查是否已预约
  const isBooked = bookings.some(booking => 
    booking.meetingId === meeting.id && booking.status === 'confirmed'
  );

  // 格式化时间显示
  const formatTime = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
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

  // 获取时段标签颜色
  const getTimeSlotColor = (timeSlot: string) => {
    if (timeSlot.includes('上午')) return '#52c41a';
    if (timeSlot.includes('下午')) return '#1890ff';
    if (timeSlot.includes('晚上')) return '#722ed1';
    return '#666666';
  };

  // 解析专场信息
  const [mainCategory, subCategory] = meeting.专场.split(' | ');

  return (
    <Card
      className="mb-3 shadow-sm hover:shadow-md transition-shadow duration-200"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="space-y-3">
        {/* 头部：标题和预约状态 */}
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 leading-tight flex-1 mr-2">
            {meeting.标题}
          </h3>
          {showBookingStatus && isBooked && (
            <Tag color="success" className="shrink-0">
              已预约
            </Tag>
          )}
        </div>

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2">
          <Tag 
            color={getCategoryColor(mainCategory)}
            className="text-xs"
          >
            {mainCategory}
          </Tag>
          {subCategory && (
            <Tag 
              color="default"
              className="text-xs"
            >
              {subCategory}
            </Tag>
          )}
        </div>

        {/* 时间和地点信息 */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Calendar className="mr-2 text-blue-500 dark:text-blue-400" size={16} />
            <span>{formatDate(meeting.日期)}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Clock className="mr-2 text-green-500 dark:text-green-400" size={16} />
            <span>{formatTime(meeting.开始时间, meeting.结束时间)}</span>
            <Tag 
              color={getTimeSlotColor(meeting.时段)}
              className="ml-2 text-xs"
            >
              {meeting.时段}
            </Tag>
          </div>
        </div>

        {/* 讲师信息 */}
        {meeting.嘉宾 && meeting.嘉宾.length > 0 && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <User className="mr-2 text-purple-500 dark:text-purple-400" size={16} />
            <div className="flex flex-wrap gap-1">
              {meeting.嘉宾.slice(0, 3).map((guest, index) => (
                <span key={index} className="inline-flex items-center">
                  <span className="font-medium">{guest.姓名}</span>
                  {guest.头衔 && (
                    <span className="text-gray-500 dark:text-gray-400 ml-1">({guest.头衔})</span>
                  )}
                  {index < Math.min(meeting.嘉宾.length - 1, 2) && (
                    <span className="mx-1 text-gray-400 dark:text-gray-500">•</span>
                  )}
                </span>
              ))}
              {meeting.嘉宾.length > 3 && (
                <span className="text-gray-500 dark:text-gray-400">等{meeting.嘉宾.length}位讲师</span>
              )}
            </div>
          </div>
        )}

        {/* 简介预览 */}
        {meeting.简介 && (
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <p className="line-clamp-2">
              {meeting.简介.length > 100 
                ? `${meeting.简介.substring(0, 100)}...` 
                : meeting.简介
              }
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MeetingCard;