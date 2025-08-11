import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  List,
  Switch,
  Selector,
  Card,
  Modal,
  Toast,
  Button,
} from "antd-mobile";
import { Bell, HelpCircle, ExternalLink } from "lucide-react";
import { useAppStore } from "../store";
import { UserPreferences } from "../types";
// import { useTheme } from "../hooks/useTheme";
import Layout from "../components/Layout";
import NotificationStatus from "../components/NotificationStatus";
import { pwaService } from "../lib/pwa";
import { audioService } from "../lib/audioService";
import { reminderService } from "../lib/reminderService";

const Settings = () => {
  const navigate = useNavigate();
  const {
    userPreferences,
    updateUserPreferences,
    bookings,
    meetings,
    clearAllData,
  } = useAppStore();

  // const { themeMode, setTheme } = useTheme();
  const [localPreferences, setLocalPreferences] =
    useState<UserPreferences>(userPreferences);
  const [showClearModal, setShowClearModal] = useState(false);

  // 初始化时从本地存储加载配置
  useEffect(() => {
    const loadLocalPreferences = () => {
      try {
        const savedPreferences = localStorage.getItem('userPreferences');
        if (savedPreferences) {
          const parsedPreferences = JSON.parse(savedPreferences);
          setLocalPreferences(parsedPreferences);
          // 同步到状态管理
          updateUserPreferences(parsedPreferences);
        } else {
          setLocalPreferences(userPreferences);
        }
      } catch (error) {
        console.error('加载本地配置失败:', error);
        setLocalPreferences(userPreferences);
      }
    };
    
    loadLocalPreferences();
  }, []);

  // 同步本地偏好设置
  useEffect(() => {
    if (!localStorage.getItem('userPreferences')) {
      setLocalPreferences(userPreferences);
    }
  }, [userPreferences]);

  // 即时保存设置
  const handlePreferenceChange = async (newPreferences: UserPreferences) => {
    setLocalPreferences(newPreferences);
    try {
      // 保存到状态管理
      await updateUserPreferences(newPreferences);
      // 保存到本地存储
      localStorage.setItem('userPreferences', JSON.stringify(newPreferences));
      // 更新提醒服务的用户偏好
      reminderService.setUserPreferences(newPreferences);
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  // 清除所有数据
  const handleClearAllData = async () => {
    try {
      await clearAllData();
      Toast.show("数据已清除");
      setShowClearModal(false);
    } catch (error) {
      Toast.show("清除失败，请重试");
      console.error(error)
    }
  };


  // 提醒时间选项
  const reminderTimeOptions = [
    { label: "5分钟前", value: 5 },
    { label: "10分钟前", value: 10 },
    { label: "15分钟前", value: 15 },
    { label: "30分钟前", value: 30 },
    { label: "1小时前", value: 60 },
    { label: "2小时前", value: 120 },
  ];

  // // 主题选项
  // const themeOptions = [
  //   { label: "跟随系统", value: "system" },
  //   { label: "浅色模式", value: "light" },
  //   { label: "深色模式", value: "dark" },
  // ];

  // // 处理主题变更
  // const handleThemeChange = (value: string[]) => {
  //   const newTheme = value[0] as "light" | "dark" | "system";
  //   setTheme(newTheme);
  //   // 同时更新用户偏好设置
  //   handlePreferenceChange({
  //     ...localPreferences,
  //     theme: newTheme === "system" ? "auto" : newTheme,
  //   });
  // };


  // 获取统计信息
  const getStats = () => {
    const totalMeetings = meetings.length;
    const bookedMeetings = bookings.filter(
      (b) => b.status === "confirmed"
    ).length;
    const dataSize = JSON.stringify({ meetings, bookings }).length;
    const dataSizeKB = Math.round((dataSize / 1024) * 100) / 100;

    return {
      totalMeetings,
      bookedMeetings,
      dataSizeKB,
    };
  };

  const stats = getStats();

  return (
    <Layout>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* 头部 */}
        <div className="bg-white dark:bg-gray-800 sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 p-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">设置</h1>
        </div>

        <div className="p-4 space-y-4">
          {/* 提醒设置 */}
          <Card title="📢 提醒设置" className="shadow-sm dark:bg-gray-800">
            <List>
              {/* 通知权限状态 */}
              <NotificationStatus 
                onPermissionChange={(permission) => {
                  // 根据权限状态自动调整通知开关
                  if (permission === 'granted' && !localPreferences.notificationEnabled) {
                    handlePreferenceChange({
                      ...localPreferences,
                      notificationEnabled: true,
                    });
                  } else if (permission === 'denied' && localPreferences.notificationEnabled) {
                    handlePreferenceChange({
                      ...localPreferences,
                      notificationEnabled: false,
                    });
                  }
                }}
              />
              
              <List.Item
                prefix={<Bell size={20} className="text-gray-600 dark:text-gray-300" />}
                extra={
                  <Switch
                    checked={localPreferences.notificationEnabled}
                    onChange={(checked) =>
                      handlePreferenceChange({
                        ...localPreferences,
                        notificationEnabled: checked,
                      })
                    }
                  />
                }
              >
                <span className="text-gray-800 dark:text-gray-100">开启会议提醒</span>
              </List.Item>

              {localPreferences.notificationEnabled && (
                <>
                  <List.Item>
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        默认提醒时间
                      </div>
                      <Selector
                        options={reminderTimeOptions}
                        value={[localPreferences.defaultReminderTime]}
                        onChange={(value) =>
                          handlePreferenceChange({
                            ...localPreferences,
                            defaultReminderTime: value[0] || 15,
                          })
                        }
                        className="dark:selector-dark"
                        style={{
                          "--border": "1px solid #d9d9d9",
                          "--border-radius": "8px",
                        }}
                      />
                    </div>
                  </List.Item>

                  <List.Item
                    extra={
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={localPreferences.enableSound}
                          onChange={(checked) =>
                            handlePreferenceChange({
                              ...localPreferences,
                              enableSound: checked,
                            })
                          }
                        />
                        {localPreferences.enableSound && (
                          <Button
                            size="small"
                            fill="none"
                            onClick={async () => {
                              try {
                                await audioService.testSound();
                                Toast.show('测试声音播放成功');
                              } catch (error) {
                                Toast.show('声音播放失败，请检查设备音量');
                                console.error(error)
                              }
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400"
                          >
                            测试
                          </Button>
                        )}
              
              {/* 测试通知功能 */}
              {localPreferences.notificationEnabled && (
                <List.Item>
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      测试通知功能
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="small"
                        color="primary"
                        onClick={async () => {
                          try {
                            await pwaService.testNotification({
                              enableSound: localPreferences.enableSound,
                              enableVibration: localPreferences.enableVibration
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
                                enableSound: localPreferences.enableSound,
                                enableVibration: localPreferences.enableVibration
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
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      测试通知功能是否正常工作，包括声音和震动效果
                    </p>
                  </div>
                </List.Item>
              )}
                      </div>
                    }
                  >
                    <span className="text-gray-800 dark:text-gray-100">提醒声音</span>
                  </List.Item>

                  <List.Item
                    extra={
                      <Switch
                        checked={localPreferences.enableVibration}
                        onChange={(checked) =>
                          handlePreferenceChange({
                            ...localPreferences,
                            enableVibration: checked,
                          })
                        }
                      />
                    }
                  >
                    <span className="text-gray-800 dark:text-gray-100">震动提醒</span>
                  </List.Item>
                </>
              )}
            </List>
          </Card>

          {/* <Card title="🎨 显示设置" className="shadow-sm dark:bg-gray-800">
            <List>
              <List.Item>
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    主题模式
                  </div>
                  <Selector
                    options={themeOptions}
                    value={[themeMode]}
                    onChange={handleThemeChange}
                    className="dark:selector-dark"
                    style={{
                      "--border": "1px solid #d9d9d9",
                      "--border-radius": "8px",
                    }}
                  />
                </div>
              </List.Item>

            </List>
          </Card> */}

          {/* 数据统计 */}
          <Card title="📊 数据统计" className="shadow-sm dark:bg-gray-800">
            <List>
              <List.Item>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {stats.totalMeetings}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">总会议数</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {stats.bookedMeetings}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">已预约</div>
                    </div>
                  </div>
                  {/* 移除数据大小显示 */}
                </div>
              </List.Item>
            </List>
          </Card>

          {/* 帮助与支持 */}
          <Card title="❓ 帮助与支持" className="shadow-sm dark:bg-gray-800">
            <List>
              <List.Item 
                prefix={<HelpCircle size={20} className="text-gray-600 dark:text-gray-300" />} 
                extra={<ExternalLink size={16} className="text-gray-400 dark:text-gray-500" />}
                clickable
                onClick={() => navigate('/help')}
              >
                <span className="text-gray-800 dark:text-gray-100">帮助中心</span>
              </List.Item>
            </List>
          </Card>

          {/* 关于 */}
          <Card title="ℹ️ 关于" className="shadow-sm dark:bg-gray-800">
            <List>
              <List.Item>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    2025 Google开发者大会会议预约助手
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">版本 1.0.0</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    帮助您管理会议行程，避免时间冲突
                  </div>
                </div>
              </List.Item>
            </List>
          </Card>


        </div>

        {/* 清除数据确认弹窗 */}
        <Modal
          visible={showClearModal}
          onClose={() => setShowClearModal(false)}
          title="确认清除数据"
          content={
            <div className="space-y-4">
              <div className="text-gray-700">此操作将清除以下数据：</div>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• 所有会议预约记录</li>
                <li>• 所有提醒设置</li>
                <li>• 用户偏好设置</li>
                <li>• 本地缓存的会议数据</li>
              </ul>
              <div className="text-red-600 text-sm font-medium">
                ⚠️ 此操作不可恢复，请谨慎操作！
              </div>
            </div>
          }
          actions={[
            {
              key: "cancel",
              text: "取消",
              onClick: () => setShowClearModal(false),
            },
            {
              key: "confirm",
              text: "确认清除",
              primary: true,
              danger: true,
              onClick: handleClearAllData,
            },
          ]}
        />
      </div>
    </Layout>
  );
};

export default Settings;
