import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { List, Switch, Selector, Card, Modal, Toast } from "antd-mobile";
import {
  Bell,
  HelpCircle,
  ExternalLink,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAppStore } from "../store";
import { UserPreferences } from "../types";
// import { useTheme } from "../hooks/useTheme";
import Layout from "../components/Layout";
import NotificationStatus from "../components/NotificationStatus";
import { reminderService } from "../lib/reminderService";
import { trackUserInteraction, trackPageView } from "../utils/analytics";
import DebugConsole from "../components/DebugConsole";

// 默认用户偏好设置
const DEFAULT_USER_PREFERENCES: UserPreferences = {
  userId: "default",
  interests: [],
  defaultReminderTime: 15,
  notificationEnabled: true,
  enableSound: true,
  enableVibration: true,
  theme: "auto",
  language: "zh-CN",
  pageSize: 20,
};

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
  const [localPreferences, setLocalPreferences] = useState<UserPreferences>(
    userPreferences || DEFAULT_USER_PREFERENCES
  );
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDebugConsole, setShowDebugConsole] = useState(false);

  // 初始化时从本地存储加载配置
  useEffect(() => {
    const loadLocalPreferences = () => {
      try {
        // iOS Safari 兼容性检查
        if (typeof Storage === "undefined") {
          console.warn("localStorage 不可用，使用默认设置");
          setLocalPreferences(userPreferences || DEFAULT_USER_PREFERENCES);
          return;
        }

        const savedPreferences = localStorage.getItem("userPreferences");
        if (savedPreferences) {
          const parsedPreferences = JSON.parse(savedPreferences);
          // 合并默认值，确保所有字段都存在
          const mergedPreferences = {
            ...DEFAULT_USER_PREFERENCES,
            ...parsedPreferences,
          };
          setLocalPreferences(mergedPreferences);
          // 同步到状态管理
          updateUserPreferences(mergedPreferences);
        } else {
          const defaultPrefs = userPreferences || DEFAULT_USER_PREFERENCES;
          setLocalPreferences(defaultPrefs);
          // 保存默认设置到localStorage
          try {
            localStorage.setItem(
              "userPreferences",
              JSON.stringify(defaultPrefs)
            );
          } catch (storageError) {
            console.warn("无法保存到localStorage:", storageError);
          }
        }
      } catch (error) {
        console.error("加载本地配置失败:", error);
        const fallbackPrefs = userPreferences || DEFAULT_USER_PREFERENCES;
        setLocalPreferences(fallbackPrefs);
      }
    };

    loadLocalPreferences();

    // 追踪页面浏览
    trackPageView("设置页面", "/settings");
  }, []);

  // 同步本地偏好设置
  useEffect(() => {
    if (userPreferences && typeof Storage !== "undefined") {
      try {
        if (!localStorage.getItem("userPreferences")) {
          const mergedPreferences = {
            ...DEFAULT_USER_PREFERENCES,
            ...userPreferences,
          };
          setLocalPreferences(mergedPreferences);
        }
      } catch (error) {
        console.warn("localStorage 访问失败:", error);
        setLocalPreferences(userPreferences || DEFAULT_USER_PREFERENCES);
      }
    } else if (userPreferences) {
      setLocalPreferences(userPreferences);
    }
  }, [userPreferences]);

  // 即时保存设置
  const handlePreferenceChange = async (newPreferences: UserPreferences) => {
    const oldPreferences = localPreferences || DEFAULT_USER_PREFERENCES;
    // 确保新设置包含所有必需字段
    const safeNewPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      ...newPreferences,
    };
    setLocalPreferences(safeNewPreferences);
    try {
      // 保存到状态管理
      await updateUserPreferences(safeNewPreferences);
      // 保存到本地存储（iOS Safari 兼容性处理）
      if (typeof Storage !== "undefined") {
        try {
          localStorage.setItem(
            "userPreferences",
            JSON.stringify(safeNewPreferences)
          );
        } catch (storageError) {
          console.warn("localStorage 保存失败:", storageError);
        }
      }
      // 更新提醒服务的用户偏好
      reminderService.setUserPreferences(safeNewPreferences);

      // 追踪设置变更事件
      const changedSettings = Object.keys(safeNewPreferences).filter(
        (key) =>
          oldPreferences[key as keyof UserPreferences] !==
          safeNewPreferences[key as keyof UserPreferences]
      );

      if (changedSettings.length > 0) {
        trackUserInteraction("settings_change", "preferences", {
          changed_settings: changedSettings.join(","),
          notification_enabled: safeNewPreferences.notificationEnabled,
          reminder_time: safeNewPreferences.defaultReminderTime,
        });
      }
    } catch (error) {
      console.error("保存设置失败:", error);
    }
  };

  // 清除所有数据
  const handleClearAllData = async () => {
    try {
      await clearAllData();

      // 追踪数据清除事件
      trackUserInteraction("data_clear", "settings", {
        total_meetings: stats.totalMeetings,
        booked_meetings: stats.bookedMeetings,
      });

      Toast.show("数据已清除");
      setShowClearModal(false);
    } catch (error) {
      Toast.show("清除失败，请重试");
      console.error(error);
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
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            设置
          </h1>
        </div>

        <div className="p-4 space-y-4">
          {/* 提醒设置 */}
          <Card title="📢 提醒设置" className="shadow-sm dark:bg-gray-800">
            <List>
              {/* 通知权限状态 */}
              <NotificationStatus
                onPermissionChange={(permission) => {
                  // 根据权限状态自动调整通知开关
                  const currentPrefs =
                    localPreferences || DEFAULT_USER_PREFERENCES;
                  if (
                    permission === "granted" &&
                    !currentPrefs.notificationEnabled
                  ) {
                    handlePreferenceChange({
                      ...currentPrefs,
                      notificationEnabled: true,
                    });
                  } else if (
                    permission === "denied" &&
                    currentPrefs.notificationEnabled
                  ) {
                    handlePreferenceChange({
                      ...currentPrefs,
                      notificationEnabled: false,
                    });
                  }
                }}
              />

              <List.Item
                prefix={
                  <Bell
                    size={20}
                    className="text-gray-600 dark:text-gray-300"
                  />
                }
                extra={
                  <Switch
                    checked={
                      localPreferences?.notificationEnabled ??
                      DEFAULT_USER_PREFERENCES.notificationEnabled
                    }
                    onChange={(checked) => {
                      const currentPrefs =
                        localPreferences || DEFAULT_USER_PREFERENCES;
                      handlePreferenceChange({
                        ...currentPrefs,
                        notificationEnabled: checked,
                      });
                    }}
                  />
                }
              >
                <span className="text-gray-800 dark:text-gray-100">
                  开启会议提醒
                </span>
              </List.Item>

              {(localPreferences?.notificationEnabled ??
                DEFAULT_USER_PREFERENCES.notificationEnabled) && (
                <>
                  <List.Item>
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        默认提醒时间
                      </div>
                      <Selector
                        options={reminderTimeOptions}
                        value={[
                          localPreferences?.defaultReminderTime ??
                            DEFAULT_USER_PREFERENCES.defaultReminderTime,
                        ]}
                        onChange={(value) => {
                          const currentPrefs =
                            localPreferences || DEFAULT_USER_PREFERENCES;
                          handlePreferenceChange({
                            ...currentPrefs,
                            defaultReminderTime: value[0] || 15,
                          });
                        }}
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
                          checked={
                            localPreferences?.enableSound ??
                            DEFAULT_USER_PREFERENCES.enableSound
                          }
                          onChange={(checked) => {
                            const currentPrefs =
                              localPreferences || DEFAULT_USER_PREFERENCES;
                            handlePreferenceChange({
                              ...currentPrefs,
                              enableSound: checked,
                            });
                          }}
                        />
                      </div>
                    }
                  >
                    <span className="text-gray-800 dark:text-gray-100">
                      提醒声音
                    </span>
                  </List.Item>

                  <List.Item
                    extra={
                      <Switch
                        checked={
                          localPreferences?.enableVibration ??
                          DEFAULT_USER_PREFERENCES.enableVibration
                        }
                        onChange={(checked) => {
                          const currentPrefs =
                            localPreferences || DEFAULT_USER_PREFERENCES;
                          handlePreferenceChange({
                            ...currentPrefs,
                            enableVibration: checked,
                          });
                        }}
                      />
                    }
                  >
                    <span className="text-gray-800 dark:text-gray-100">
                      震动提醒
                    </span>
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
                      <div className="text-gray-600 dark:text-gray-400">
                        总会议数
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {stats.bookedMeetings}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        已预约
                      </div>
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
                prefix={
                  <HelpCircle
                    size={20}
                    className="text-gray-600 dark:text-gray-300"
                  />
                }
                extra={
                  <ExternalLink
                    size={16}
                    className="text-gray-400 dark:text-gray-500"
                  />
                }
                clickable
                onClick={() => {
                  navigate("/help");
                  trackUserInteraction("navigation", "help_center", {});
                }}
              >
                <span className="text-gray-800 dark:text-gray-100">
                  帮助中心
                </span>
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    版本 1.1.7
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    帮助您管理会议行程，避免时间冲突
                  </div>
                </div>
              </List.Item>
            </List>
          </Card>
          
          {/* 调试面板 */}
          <Card title="🔧 调试面板" className="shadow-sm dark:bg-gray-800">
            <List>
              <List.Item
                prefix={
                  <SettingsIcon
                    size={20}
                    className="text-gray-600 dark:text-gray-300"
                  />
                }
                clickable
                onClick={() => setShowDebugConsole(true)}
              >
                <div className="space-y-1">
                  <span className="text-gray-800 dark:text-gray-100">
                    调试控制台
                  </span>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    查看数据加载状态和错误日志
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

        {/* 调试控制台 */}
        <DebugConsole
          visible={showDebugConsole}
          onClose={() => setShowDebugConsole(false)}
        />
      </div>
    </Layout>
  );
};

export default Settings;
