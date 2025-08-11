import { useState, useEffect } from 'react';
import { 
  Modal, 
  Selector, 
  Divider,
} from 'antd-mobile';
import { MeetingFilter } from '../types';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onFilter: (filter: MeetingFilter) => void;
  categories: string[];
  dates: string[];
  currentFilter: MeetingFilter;
}

const FilterModal = ({ 
  visible, 
  onClose, 
  onFilter, 
  categories, 
  dates, 
  currentFilter 
}: FilterModalProps) => {
  const [tempFilter, setTempFilter] = useState<MeetingFilter>({});

  // 当弹窗打开时，初始化临时筛选条件
  useEffect(() => {
    if (visible) {
      setTempFilter(currentFilter);
    }
  }, [visible, currentFilter]);

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 周${weekday}`;
  };

  // 时段选项
  const timeSlots = [
    { label: '上午 (06:00-12:00)', value: '上午' },
    { label: '下午 (12:00-18:00)', value: '下午' },
    { label: '晚上 (18:00-24:00)', value: '晚上' }
  ];

  // 处理分类选择
  const handleCategoryChange = (value: string[]) => {
    setTempFilter({
      ...tempFilter,
      category: value.length > 0 ? value[0] : undefined
    });
  };

  // 处理日期选择
  const handleDateChange = (value: string[]) => {
    setTempFilter({
      ...tempFilter,
      date: value.length > 0 ? value[0] : undefined
    });
  };

  // 处理时段选择
  const handleTimeSlotChange = (value: string[]) => {
    setTempFilter({
      ...tempFilter,
      timeSlot: value.length > 0 ? value[0] : undefined
    });
  };

  // 应用筛选
  const handleApply = () => {
    onFilter(tempFilter);
  };

  // 重置筛选
  const handleReset = () => {
    const resetFilter = {
      searchText: currentFilter.searchText // 保留搜索文本
    };
    setTempFilter(resetFilter);
    onFilter(resetFilter);
  };

  // 准备分类选项
  const categoryOptions = categories.map(cat => ({
    label: cat,
    value: cat
  }));

  // 准备日期选项
  const dateOptions = dates.map(date => ({
    label: formatDate(date),
    value: date
  }));

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="筛选会议"
      content={
        <div className="space-y-6 py-4">
          {/* 分类筛选 */}
          <div>
            <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
              会议分类
            </h4>
            <Selector
              options={categoryOptions}
              value={tempFilter.category ? [tempFilter.category] : []}
              onChange={handleCategoryChange}
              multiple={false}
              className="filter-selector"
              style={{
                '--border': '1px solid #d9d9d9',
                '--border-radius': '8px',
                '--checked-color': '#1890ff'
              }}
            />
          </div>

          <Divider />

          {/* 日期筛选 */}
          <div>
            <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
              会议日期
            </h4>
            <Selector
              options={dateOptions}
              value={tempFilter.date ? [tempFilter.date] : []}
              onChange={handleDateChange}
              multiple={false}
              className="filter-selector"
              style={{
                '--border': '1px solid #d9d9d9',
                '--border-radius': '8px',
                '--checked-color': '#1890ff'
              }}
            />
          </div>

          <Divider />

          {/* 时段筛选 */}
          <div>
            <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
              时段
            </h4>
            <Selector
              options={timeSlots}
              value={tempFilter.timeSlot ? [tempFilter.timeSlot] : []}
              onChange={handleTimeSlotChange}
              multiple={false}
              className="filter-selector"
              style={{
                '--border': '1px solid #d9d9d9',
                '--border-radius': '8px',
                '--checked-color': '#1890ff'
              }}
            />
          </div>

          {/* 当前筛选条件预览 */}
          {(tempFilter.category || tempFilter.date || tempFilter.timeSlot) && (
            <>
              <Divider />
              <div>
                <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
                  当前筛选条件
                </h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {tempFilter.category && (
                    <div>分类：{tempFilter.category}</div>
                  )}
                  {tempFilter.date && (
                    <div>日期：{formatDate(tempFilter.date)}</div>
                  )}
                  {tempFilter.timeSlot && (
                    <div>时段：{tempFilter.timeSlot}</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      }
      actions={[
        {
          key: 'reset',
          text: '重置',
          onClick: handleReset,
          style: {
            color: '#666666'
          }
        },
        {
          key: 'apply',
          text: '应用筛选',
          primary: true,
          onClick: handleApply
        }
      ]}
    />
  );
};

export default FilterModal;