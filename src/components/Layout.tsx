import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TabBar } from 'antd-mobile';
import { 
  Home, 
  Calendar, 
  Settings 
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    {
      key: '/',
      title: '会议',
      icon: <Home />,
    },
    {
      key: '/schedule',
      title: '我的行程',
      icon: <Calendar />,
    },
    {
      key: '/settings',
      title: '设置',
      icon: <Settings />,
    },
  ];

  const handleTabChange = (key: string) => {
    navigate(key);
  };

  // 获取当前激活的tab
  const getActiveKey = () => {
    const pathname = location.pathname;
    if (pathname.startsWith('/meeting/')) {
      return '/';
    }
    return pathname;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 主内容区域 */}
      <main className="flex-1">
        {children}
      </main>

      {/* 底部导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <TabBar
          activeKey={getActiveKey()}
          onChange={handleTabChange}
          className="bg-white dark:bg-gray-800"
        >
          {tabs.map(item => (
            <TabBar.Item
              key={item.key}
              icon={item.icon}
              title={item.title}
            />
          ))}
        </TabBar>
      </div>
    </div>
  );
};

export default Layout;