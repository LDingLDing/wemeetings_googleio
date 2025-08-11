import React, { useState } from 'react';
import { NavBar, Card, Collapse, Space, Tag, Button, Toast } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Bell,
  Download,
  Settings,
  Smartphone,
  Volume2,
  Vibrate,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import Layout from '../components/Layout';
import { pwaService } from '../lib/pwa';
import { audioService } from '../lib/audioService';
import { useAppStore } from '../store';

const Help = () => {
  const navigate = useNavigate();
  const [activeKey, setActiveKey] = useState<string[]>([]);
  const { userPreferences } = useAppStore();

  const faqData = [
    {
      key: 'pwa-install',
      title: '如何安装PWA应用？',
      content: (
        <div className="space-y-3">
          <p className="text-gray-600 dark:text-gray-300">
            PWA（渐进式Web应用）可以像原生应用一样安装到您的设备上：
          </p>
          <div className="space-y-2">
            <div className="flex items-start">
              <span className="inline-block w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center mr-3 mt-0.5">1</span>
              <div>
                <p className="font-medium">浏览器提示安装</p>
                <p className="text-sm text-gray-500">当应用检测到支持PWA时，会自动显示安装横幅或弹窗</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="inline-block w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center mr-3 mt-0.5">2</span>
              <div>
                <p className="font-medium">手动安装</p>
                <p className="text-sm text-gray-500">Chrome: 地址栏右侧的安装图标 | Safari: 分享 → 添加到主屏幕</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'notifications',
      title: '如何开启通知权限？',
      content: (
        <div className="space-y-3">
          <p className="text-gray-600 dark:text-gray-300">
            开启通知权限后，您可以及时收到会议提醒：
          </p>
          <div className="space-y-2">
            <div className="flex items-start">
              <Bell className="w-5 h-5 text-orange-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">浏览器通知</p>
                <p className="text-sm text-gray-500">应用会在适当时机请求通知权限，请点击"允许"</p>
              </div>
            </div>
            <div className="flex items-start">
              <Settings className="w-5 h-5 text-gray-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">手动设置</p>
                <p className="text-sm text-gray-500">在设置页面可以查看和管理通知权限状态</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'booking',
      title: '如何预约和管理会议？',
      content: (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">浏览会议</p>
                <p className="text-sm text-gray-500">在首页浏览所有可用会议，使用筛选功能找到感兴趣的内容</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">预约会议</p>
                <p className="text-sm text-gray-500">点击会议卡片查看详情，然后点击"立即预约"按钮</p>
              </div>
            </div>
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">冲突检测</p>
                <p className="text-sm text-gray-500">系统会自动检测时间冲突并给出提示</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'reminders',
      title: '会议提醒如何工作？',
      content: (
        <div className="space-y-3">
          <p className="text-gray-600 dark:text-gray-300">
            智能提醒系统确保您不会错过重要会议：
          </p>
          <div className="space-y-2">
            <div className="flex items-start">
              <Bell className="w-5 h-5 text-orange-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">自动提醒</p>
                <p className="text-sm text-gray-500">预约成功后自动设置提醒（默认15分钟前和5分钟前）</p>
              </div>
            </div>
            <div className="flex items-start">
              <Volume2 className="w-5 h-5 text-purple-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">声音提醒</p>
                <p className="text-sm text-gray-500">可在设置中开启/关闭提醒声音</p>
              </div>
            </div>
            <div className="flex items-start">
              <Vibrate className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">震动提醒</p>
                <p className="text-sm text-gray-500">支持设备震动提醒（需设备支持）</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'offline',
      title: '离线功能如何使用？',
      content: (
        <div className="space-y-3">
          <p className="text-gray-600 dark:text-gray-300">
            PWA应用支持离线访问，让您随时随地使用：
          </p>
          <div className="space-y-2">
            <div className="flex items-start">
              <Download className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">自动缓存</p>
                <p className="text-sm text-gray-500">应用会自动缓存已访问的内容</p>
              </div>
            </div>
            <div className="flex items-start">
              <Smartphone className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">离线访问</p>
                <p className="text-sm text-gray-500">无网络时仍可查看已缓存的会议信息和个人日程</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'troubleshooting',
      title: '常见问题解决',
      content: (
        <div className="space-y-3">
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">通知不工作？</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                检查浏览器通知权限设置，确保已允许通知
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">无法安装PWA？</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                确保使用支持PWA的浏览器（Chrome、Edge、Safari等）
              </p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="font-medium text-red-800 dark:text-red-200 mb-1">数据同步问题？</p>
              <p className="text-sm text-red-700 dark:text-red-300">
                尝试刷新页面或在设置中清除缓存数据
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const quickActions = [
    {
      title: '查看设置',
      description: '管理应用偏好设置',
      icon: <Settings className="w-6 h-6 text-gray-500" />,
      action: () => navigate('/settings')
    },
    {
      title: '我的日程',
      description: '查看已预约的会议',
      icon: <Calendar className="w-6 h-6 text-blue-500" />,
      action: () => navigate('/schedule')
    }
  ];

  return (
    <Layout>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-16">
        {/* 导航栏 */}
        <NavBar
          back="返回"
          onBack={() => navigate(-1)}
          className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        >
          <span className="text-gray-800 dark:text-gray-200">帮助中心</span>
        </NavBar>

        <div className="p-4 space-y-4">
          {/* 欢迎信息 */}
          <Card className="shadow-sm">
            <div className="text-center py-4">
              <HelpCircle className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                帮助中心
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                这里有您需要的所有使用指南和常见问题解答
              </p>
            </div>
          </Card>

          {/* 快速操作 */}
          <Card className="shadow-sm">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
                快速操作
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {quickActions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={action.action}
                  >
                    {action.icon}
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-gray-800 dark:text-gray-100">
                        {action.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {action.description}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* 测试功能 */}
          {userPreferences?.notificationEnabled && (
            <Card className="shadow-sm">
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
                  🔔 测试功能
                </h2>
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    测试通知功能
                  </div>
                  <div className="flex flex-wrap gap-2">
                     <Button
                       size="small"
                       color="primary"
                       onClick={async () => {
                         try {
                           await pwaService.testNotification({
                             enableSound: userPreferences?.enableSound,
                             enableVibration: userPreferences?.enableVibration
                           });
                           Toast.show('测试通知已发送');
                         } catch (error) {
                           Toast.show('发送测试通知失败，请检查通知权限');
                           console.error(error)
                         }
                       }}
                     >
                       发送测试通知
                     </Button>
                     <Button
                       size="small"
                       fill="outline"
                       onClick={async () => {
                         try {
                           await pwaService.sendMeetingReminder(
                             '测试会议',
                             '2025-01-20 14:00',
                             15,
                             {
                               enableSound: userPreferences?.enableSound,
                               enableVibration: userPreferences?.enableVibration
                             }
                           );
                           Toast.show('会议提醒测试已发送');
                         } catch (error) {
                           Toast.show('发送会议提醒失败');
                           console.error(error)
                         }
                       }}
                     >
                       测试会议提醒
                     </Button>
                     {userPreferences?.enableSound && (
                       <Button
                         size="small"
                         fill="outline"
                         onClick={async () => {
                           try {
                             await audioService.testSound();
                             Toast.show('测试声音播放成功');
                           } catch (error) {
                             Toast.show('声音播放失败，请检查设备音量');
                             console.error(error)
                           }
                         }}
                         className="text-blue-600 dark:text-blue-400"
                       >
                         测试声音
                       </Button>
                     )}
                   </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    测试通知功能是否正常工作，包括声音和震动效果
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* 常见问题 */}
          <Card className="shadow-sm">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
                常见问题
              </h2>
              <Collapse
                activeKey={activeKey}
                onChange={setActiveKey}
                accordion={false}
              >
                {faqData.map((item) => (
                  <Collapse.Panel key={item.key} title={item.title}>
                    {item.content}
                  </Collapse.Panel>
                ))}
              </Collapse>
            </div>
          </Card>

          {/* 功能特性 */}
          <Card className="shadow-sm">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
                应用特性
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3">
                  <Download className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">PWA安装</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">原生应用体验</p>
                </div>
                <div className="text-center p-3">
                  <Bell className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">智能提醒</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">不错过会议</p>
                </div>
                <div className="text-center p-3">
                  <Smartphone className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">离线访问</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">无网络可用</p>
                </div>
                <div className="text-center p-3">
                  <CheckCircle className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">冲突检测</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">智能调度</p>
                </div>
              </div>
            </div>
          </Card>

          {/* 联系支持 */}
          <Card className="shadow-sm">
            <div className="text-center py-4">
              <MessageCircle className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                需要更多帮助？
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                如果您遇到其他问题，欢迎联系我 main@aloea.cn
              </p>
              <Space>
                <Tag color="primary">技术支持</Tag>
                <Tag color="success">用户反馈</Tag>
              </Space>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Help;