import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  SearchBar, 
  Tabs, 
  Tag, 
  Button, 
  Empty,
  PullToRefresh,
  InfiniteScroll,
  Toast
} from 'antd-mobile';
import { Filter, Twitter, BookOpen, AlertTriangle, RefreshCw } from 'lucide-react';
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
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const pageSize = 10;
  const maxRetries = 3;

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

  // 会议数据诊断和修复
  const diagnoseMeetingData = async (): Promise<boolean> => {
    try {
      console.log('开始会议数据诊断...');
      
      // 1. 检查JSON文件可访问性
      try {
        const response = await fetch('/io_connect_china_2025_workshops.json', {
          method: 'HEAD',
          cache: 'no-cache'
        });
        if (!response.ok) {
          throw new Error(`JSON文件访问失败 (${response.status})`);
        }
        console.log('✅ JSON文件可访问');
      } catch (error) {
        throw new Error(`JSON文件访问异常: ${error.message}`);
      }
      
      // 2. 验证数据格式并尝试导入
      try {
        const response = await fetch('/io_connect_china_2025_workshops.json');
        const textData = await response.text();
        const jsonData = JSON.parse(textData);
        
        let isValidFormat = false;
        let recordCount = 0;
        
        if (Array.isArray(jsonData)) {
          isValidFormat = jsonData.every(item => 
            item.标题 && item.专场 && item.日期 && item.开始时间 && item.结束时间
          );
          recordCount = jsonData.length;
        } else if (jsonData && jsonData.meetings && Array.isArray(jsonData.meetings)) {
          isValidFormat = jsonData.meetings.every(item => 
            item.标题 && item.专场 && item.日期 && item.开始时间 && item.结束时间
          );
          recordCount = jsonData.meetings.length;
        }
        
        if (!isValidFormat || recordCount === 0) {
          throw new Error('数据格式无效或为空');
        }
        
        console.log(`✅ 数据格式有效，包含 ${recordCount} 条记录`);
        
        // 3. 测试数据库写入权限
        const { DatabaseService } = await import('../lib/database');
        
        // 测试写入一条临时数据
        const testMeeting = {
          id: 'test-meeting-' + Date.now(),
          标题: '测试会议',
          专场: '测试专场',
          日期: '2024-01-01',
          开始时间: '10:00',
          结束时间: '11:00',
          时段: '上午',
          简介: '测试数据',
          嘉宾: []
        };
        
        await DatabaseService.addMeetings([testMeeting]);
        console.log('✅ 数据库写入权限正常');
        
        // 清理测试数据
        const { db } = await import('../lib/database');
        await db.meetings.delete(testMeeting.id);
        
        // 4. 导入实际数据
        const { DataImportService } = await import('../lib/dataImport');
        await DataImportService.initializeAppData();
        
        console.log('✅ 会议数据诊断和修复完成');
        return true;
        
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          throw new Error('存储空间不足，请清理浏览器数据或关闭隐私模式');
        } else if (error.name === 'InvalidStateError') {
          throw new Error('数据库状态异常，请刷新页面重试');
        } else if (error.name === 'UnknownError') {
          throw new Error('数据库访问被阻止，请检查浏览器存储权限设置');
        }
        throw error;
      }
      
    } catch (error) {
      console.error('会议数据诊断失败:', error);
      return false;
    }
  };

  // 自动数据加载和修复
  const autoLoadMeetingData = async () => {
    if (isDataLoading) return;
    
    setIsDataLoading(true);
    setDataLoadError(null);
    
    try {
      // 首先尝试从store加载
      await loadMeetings();
      
      // 如果数据为空且重试次数未超限，进行诊断和修复
      if (meetings.length === 0 && retryCount < maxRetries) {
        console.log(`会议数据为空，开始第 ${retryCount + 1} 次诊断修复...`);
        
        const success = await diagnoseMeetingData();
        
        if (success) {
          // 重新加载数据
          await loadMeetings();
          setRetryCount(0); // 重置重试计数
          Toast.show({
            icon: 'success',
            content: '会议数据加载成功'
          });
        } else {
          setRetryCount(prev => prev + 1);
          throw new Error('数据诊断修复失败');
        }
      }
    } catch (error) {
      console.error('自动数据加载失败:', error);
      setDataLoadError(error.message || '数据加载失败');
      
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setIsDataLoading(false);
    }
  };

  // 手动重试
  const handleRetry = async () => {
    setRetryCount(0);
    await autoLoadMeetingData();
  };

  // 下拉刷新
  const handleRefresh = async () => {
    await autoLoadMeetingData();
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

  // 组件初始化时检查和加载会议数据
  useEffect(() => {
    // 延迟检查，确保store已初始化
    const timer = setTimeout(() => {
      if (meetings.length === 0 && !isDataLoading && retryCount < maxRetries) {
        console.log('检测到会议数据为空，开始自动诊断修复...');
        autoLoadMeetingData();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

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

          {/* 数据加载状态 */}
          {isDataLoading && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-300 mb-2">正在诊断和加载会议数据...</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {retryCount > 0 && `第 ${retryCount + 1} 次尝试`}
              </p>
            </div>
          )}

          {/* 数据加载错误 */}
          {dataLoadError && !isDataLoading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    会议数据加载失败
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-300 mb-3">
                    {dataLoadError}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="small"
                      color="danger"
                      fill="outline"
                      onClick={handleRetry}
                      disabled={retryCount >= maxRetries}
                      className="flex items-center justify-center"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      {retryCount >= maxRetries ? '已达最大重试次数' : '重试'}
                    </Button>
                    {retryCount >= maxRetries && (
                      <Button
                        size="small"
                        fill="outline"
                        onClick={() => {
                          setRetryCount(0);
                          setDataLoadError(null);
                        }}
                        className="flex items-center justify-center"
                      >
                        重置
                      </Button>
                    )}
                  </div>
                  {retryCount > 0 && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                      已重试 {retryCount}/{maxRetries} 次
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 会议卡片列表 */}
          {!isDataLoading && !dataLoadError && displayedMeetings.length > 0 ? (
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
          ) : !isDataLoading && !dataLoadError && (
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
                    {(currentFilter.searchText || currentFilter.date) ? (
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
                    ) : (
                      <Button
                        size="small"
                        color="primary"
                        fill="outline"
                        onClick={handleRetry}
                        className="flex items-center justify-center mx-auto"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        重新加载数据
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