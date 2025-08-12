import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  SearchBar, 
  Tabs, 
  Tag, 
  Button, 
  Empty,
  PullToRefresh,
  InfiniteScroll
} from 'antd-mobile';
import { Filter, Twitter, BookOpen } from 'lucide-react';
import { useAppStore } from '../store';
import { Meeting, MeetingFilter } from '../types';
import MeetingCard from '../components/MeetingCard';
import FilterModal from '../components/FilterModal';
import { trackMeetingEvent, trackUserInteraction } from '../utils/analytics';

const MeetingList = () => {
  const navigate = useNavigate();
  const { 
    meetings,
    filteredMeetings, 
    loadMeetings, 
    filterMeetings, 
    currentFilter,
  } = useAppStore();
  
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showFilter, setShowFilter] = useState(false);
  const [displayedMeetings, setDisplayedMeetings] = useState<Meeting[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;

  // 获取所有分类
  const categories = useMemo(() => {
    const cats = new Set<string>();
    meetings.forEach(meeting => {
      const category = meeting.专场.split(' | ')[0];
      cats.add(category);
    });
    return Array.from(cats);
  }, [meetings]);

  // 获取所有日期
  const dates = useMemo(() => {
    const dateSet = new Set<string>();
    meetings.forEach(meeting => {
      dateSet.add(meeting.日期);
    });
    return Array.from(dateSet).sort();
  }, [meetings]);

  // 标签页配置
  const tabs = [
    { key: 'all', title: '全部' },
    ...categories.map(cat => ({ key: cat, title: cat })),
  ];

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    const newFilter: MeetingFilter = {
      ...currentFilter,
      searchText: value || undefined
    };
    filterMeetings(newFilter);
    
    // 追踪搜索事件
    if (value.trim()) {
      trackMeetingEvent('search', undefined, { search_term: value.trim() });
    }
  };

  // 处理分类切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    const newFilter: MeetingFilter = {
      ...currentFilter,
      category: key === 'all' ? undefined : key
    };
    filterMeetings(newFilter);
    
    // 追踪分类切换事件
    trackUserInteraction('tab_change', 'category_filter', { category: key });
  };

  // 处理筛选
  const handleFilter = (filter: MeetingFilter) => {
    filterMeetings(filter);
    setShowFilter(false);
    
    // 追踪筛选事件
    trackMeetingEvent('filter', undefined, {
      filter_date: filter.date,
      filter_time_slot: filter.timeSlot,
      filter_difficulty: filter.difficulty
    });
  };

  // 处理会议卡片点击
  const handleMeetingClick = (meeting: Meeting) => {
    navigate(`/meeting/${meeting.id}`);
    
    // 追踪会议查看事件
    trackMeetingEvent('view', meeting.id, {
      meeting_title: meeting.标题,
      meeting_category: meeting.专场,
      meeting_date: meeting.日期
    });
  };

  // 下拉刷新
  const handleRefresh = async () => {
    await loadMeetings();
  };

  // 无限滚动加载更多
  const loadMore = async () => {
    const currentLength = displayedMeetings.length;
    const nextBatch = filteredMeetings.slice(currentLength, currentLength + pageSize);
    
    if (nextBatch.length === 0) {
      setHasMore(false);
      return;
    }
    
    setDisplayedMeetings(prev => [...prev, ...nextBatch]);
  };

  // 当筛选结果变化时重置显示列表
  useEffect(() => {
    const initialBatch = filteredMeetings.slice(0, pageSize);
    setDisplayedMeetings(initialBatch);
    setHasMore(filteredMeetings.length > pageSize);
  }, [filteredMeetings]);

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* 头部 */}
      <div className="bg-white dark:bg-gray-800 sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
            2025 Google开发者大会
          </h1>
          
          {/* 项目介绍 */}
          <div className="mb-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
              独立开源项目，感谢支持 |
              <a 
                href="https://twitter.com/LuhuiDev" 
                target="_blank" 
                className="ml-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center"
              >
                <Twitter size={12} className="mr-1" />
                @LuhuiDev
              </a>
              <span className="text-xs text-gray-400 dark:text-gray-500 mx-2">|</span>
              <a 
                href="https://www.xiaohongshu.com/user/profile/5678ff4a50c4b4434936b793" 
                target="_blank" 
                className="ml-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center"
              >
                <BookOpen size={12} className="mr-1" />
                @Luhui Dev
              </a>
            </p>
          </div>
          
          {/* 搜索栏 */}
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <SearchBar
                placeholder="搜索会议、讲师或内容"
                value={searchText}
                onChange={handleSearch}
                className="dark:adm-search-bar-dark"
                style={{
                  '--border-radius': '12px',
                  '--background': '#f5f5f5'
                }}
              />
            </div>
            <Button
              fill="none"
              size="small"
              onClick={() => setShowFilter(true)}
              className="!p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
            >
              <Filter size={18} />
            </Button>
          </div>
        </div>

        {/* 分类标签页 */}
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          className="bg-white dark:bg-gray-800"
        >
          {tabs.map(tab => (
            <Tabs.Tab title={tab.title} key={tab.key} />
          ))}
        </Tabs>
      </div>

      {/* 会议列表 */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4">
          {/* 筛选结果提示 */}
          {(currentFilter.date || currentFilter.searchText) && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {currentFilter.date && (
                  <Tag color="primary" className="mb-1">
                    📅 {formatDate(currentFilter.date)}
                  </Tag>
                )}
                {currentFilter.searchText && (
                  <Tag color="success" className="mb-1">
                    🔍 "{currentFilter.searchText}"
                  </Tag>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                找到 {filteredMeetings.length} 个相关会议
              </p>
            </div>
          )}

          {/* 会议卡片列表 */}
          {displayedMeetings.length > 0 ? (
            <div className="space-y-3">
              {displayedMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => handleMeetingClick(meeting)}
                />
              ))}
              
              {/* 无限滚动 */}
              <InfiniteScroll loadMore={loadMore} hasMore={hasMore}>
                {hasMore ? (
                  <div className="text-center py-4">
                    <span className="text-gray-500 dark:text-gray-400">加载更多...</span>
                  </div>
                ) : (
                  <div className="text-center py-4 pb-16">
                    <span className="text-gray-400 dark:text-gray-500">没有更多会议了</span>
                  </div>
                )}
              </InfiniteScroll>
            </div>
          ) : (
            <div className="mt-8">
              <Empty
                description={
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      {currentFilter.searchText || currentFilter.date 
                        ? '没有找到符合条件的会议' 
                        : '暂无会议数据'
                      }
                    </p>
                    {(currentFilter.searchText || currentFilter.date) && (
                      <Button
                        size="small"
                        fill="outline"
                        onClick={() => {
                          setSearchText('');
                          filterMeetings({});
                          setActiveTab('all');
                        }}
                        className="dark:border-gray-600 dark:text-gray-200"
                      >
                        清除筛选条件
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* 筛选弹窗 */}
      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        onFilter={handleFilter}
        categories={categories}
        dates={dates}
        currentFilter={currentFilter}
      />
    </div>
  );
};

export default MeetingList;