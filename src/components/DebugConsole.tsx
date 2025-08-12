import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Download, Trash2, Database, Wifi, WifiOff, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { getDeviceInfo } from '../utils/deviceDetection';
import { useAppStore } from '../store';
import { openDB } from 'idb';

interface DebugLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: any;
}

interface StorageInfo {
  localStorage: {
    available: boolean;
    itemCount: number;
    totalSize: string;
    items: Record<string, any>;
  };
  indexedDB: {
    available: boolean;
    databases: string[];
    error?: string;
  };
}

interface DebugConsoleProps {
  visible: boolean;
  onClose: () => void;
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ visible, onClose }) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState<'logs' | 'storage' | 'network' | 'device'>('logs');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { meetings, userPreferences, loadMeetings, loadUserPreferences } = useAppStore();

  // 添加日志
  const addLog = (level: DebugLog['level'], message: string, data?: any) => {
    const newLog: DebugLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      data
    };
    setLogs(prev => [...prev.slice(-99), newLog]); // 保持最新100条日志
  };

  // 检查存储状态
  const checkStorageInfo = async () => {
    try {
      addLog('info', '开始检查存储状态...');
      
      // 检查 localStorage
      const localStorageInfo = {
        available: false,
        itemCount: 0,
        totalSize: '0 KB',
        items: {} as Record<string, any>
      };

      try {
        if (typeof Storage !== 'undefined' && localStorage) {
          localStorageInfo.available = true;
          localStorageInfo.itemCount = localStorage.length;
          
          let totalSize = 0;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
              const value = localStorage.getItem(key);
              if (value) {
                totalSize += key.length + value.length;
                try {
                  localStorageInfo.items[key] = JSON.parse(value);
                } catch {
                  localStorageInfo.items[key] = value;
                }
              }
            }
          }
          localStorageInfo.totalSize = `${(totalSize / 1024).toFixed(2)} KB`;
          addLog('success', `localStorage 可用，包含 ${localStorageInfo.itemCount} 个项目`);
        }
      } catch (error) {
        addLog('error', 'localStorage 检查失败', error);
      }

      // 检查 IndexedDB
      const indexedDBInfo = {
        available: false,
        databases: [] as string[],
        error: undefined as string | undefined
      };

      try {
        if ('indexedDB' in window) {
          indexedDBInfo.available = true;
          
          // 尝试打开数据库
          const db = await openDB('MeetingScheduler', 1);
          if (db) {
            indexedDBInfo.databases.push('MeetingScheduler');
            addLog('success', 'IndexedDB 可用，数据库连接成功');
            db.close();
          }
        }
      } catch (error) {
        indexedDBInfo.available = false;
        indexedDBInfo.error = error instanceof Error ? error.message : '未知错误';
        addLog('error', 'IndexedDB 检查失败', error);
      }

      setStorageInfo({
        localStorage: localStorageInfo,
        indexedDB: indexedDBInfo
      });
      
      addLog('info', '存储状态检查完成');
    } catch (error) {
      addLog('error', '存储检查过程中发生错误', error);
    }
  };

  // 清除缓存
  const clearCache = async () => {
    try {
      addLog('info', '开始清除缓存...');
      
      // 清除 localStorage
      if (localStorage) {
        const itemCount = localStorage.length;
        localStorage.clear();
        addLog('success', `已清除 localStorage (${itemCount} 个项目)`);
      }
      
      // 清除 Service Worker 缓存
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        addLog('success', `已清除 Service Worker 缓存 (${cacheNames.length} 个缓存)`);
      }
      
      addLog('success', '缓存清除完成');
      await checkStorageInfo();
    } catch (error) {
      addLog('error', '清除缓存失败', error);
    }
  };

  // 重新加载数据
  const reloadData = async () => {
    try {
      addLog('info', '开始重新加载数据...');
      
      await loadUserPreferences();
      addLog('success', '用户偏好设置加载完成');
      
      await loadMeetings();
      addLog('success', '会议数据加载完成');
      
      addLog('success', '数据重新加载完成');
    } catch (error) {
      addLog('error', '数据重新加载失败', error);
    }
  };

  // 导出日志
  const exportLogs = () => {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        deviceInfo: getDeviceInfo(),
        storageInfo,
        logs,
        appState: {
          meetingsCount: meetings?.length || 0,
          userPreferences,
          isOnline
        }
      };
      
      const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLog('success', '调试日志已导出');
    } catch (error) {
      addLog('error', '导出日志失败', error);
    }
  };

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addLog('success', '网络连接已恢复');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      addLog('warn', '网络连接已断开');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 初始化时检查存储和添加欢迎日志
  useEffect(() => {
    if (visible) {
      addLog('info', '调试控制台已启动');
      checkStorageInfo();
    }
  }, [visible]);

  // 自动滚动到最新日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogIcon = (level: DebugLog['level']) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLogTextColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-600';
      case 'warn':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  console.log("#1")
  if (!visible) return null;
  console.log("#2")

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full h-4/5 rounded-t-lg shadow-lg flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">调试控制台</h2>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex border-b">
          {[
            { key: 'logs', label: '日志', icon: Info },
            { key: 'storage', label: '存储', icon: Database },
            { key: 'network', label: '网络', icon: isOnline ? Wifi : WifiOff },
            { key: 'device', label: '设备', icon: Info }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
                activeTab === key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'logs' && (
            <div className="h-full flex flex-col">
              {/* 操作按钮 */}
              <div className="flex gap-2 p-3 border-b">
                <button
                  onClick={reloadData}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  <RefreshCw className="w-4 h-4" />
                  重新加载
                </button>
                <button
                  onClick={clearCache}
                  className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  清除缓存
                </button>
                <button
                  onClick={exportLogs}
                  className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  <Download className="w-4 h-4" />
                  导出日志
                </button>
              </div>
              
              {/* 日志列表 */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-sm">
                    {getLogIcon(log.level)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">{log.timestamp}</span>
                        <span className={`font-medium ${getLogTextColor(log.level)}`}>
                          {log.message}
                        </span>
                      </div>
                      {log.data && (
                        <pre className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {activeTab === 'storage' && storageInfo && (
            <div className="p-4 space-y-4 overflow-y-auto h-full">
              {/* localStorage 信息 */}
              <div className="bg-gray-50 p-3 rounded">
                <h3 className="font-medium text-gray-800 mb-2">localStorage</h3>
                <div className="text-sm space-y-1">
                  <p>状态: {storageInfo.localStorage.available ? '✅ 可用' : '❌ 不可用'}</p>
                  <p>项目数量: {storageInfo.localStorage.itemCount}</p>
                  <p>总大小: {storageInfo.localStorage.totalSize}</p>
                </div>
                {Object.keys(storageInfo.localStorage.items).length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">查看存储项目</summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(storageInfo.localStorage.items, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              {/* IndexedDB 信息 */}
              <div className="bg-gray-50 p-3 rounded">
                <h3 className="font-medium text-gray-800 mb-2">IndexedDB</h3>
                <div className="text-sm space-y-1">
                  <p>状态: {storageInfo.indexedDB.available ? '✅ 可用' : '❌ 不可用'}</p>
                  {storageInfo.indexedDB.error && (
                    <p className="text-red-600">错误: {storageInfo.indexedDB.error}</p>
                  )}
                  <p>数据库: {storageInfo.indexedDB.databases.join(', ') || '无'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <h3 className="font-medium text-gray-800 mb-2">网络状态</h3>
                <div className="text-sm space-y-1">
                  <p>连接状态: {isOnline ? '✅ 在线' : '❌ 离线'}</p>
                  <p>用户代理: {navigator.userAgent}</p>
                  {(navigator as any).connection && (
                    <>
                      <p>连接类型: {(navigator as any).connection.effectiveType || '未知'}</p>
                      <p>下行速度: {(navigator as any).connection.downlink || '未知'} Mbps</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'device' && (
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <h3 className="font-medium text-gray-800 mb-2">设备信息</h3>
                <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                  {JSON.stringify(getDeviceInfo(), null, 2)}
                </pre>
              </div>
              
              <div className="bg-gray-50 p-3 rounded">
                <h3 className="font-medium text-gray-800 mb-2">应用状态</h3>
                <div className="text-sm space-y-1">
                  <p>会议数量: {meetings?.length || 0}</p>
                  <p>用户偏好: {userPreferences ? '已加载' : '未加载'}</p>
                  <p>通知权限: {Notification.permission}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugConsole;