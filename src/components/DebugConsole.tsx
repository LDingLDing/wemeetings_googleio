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
  const originalConsole = useRef<{
    log: typeof console.log;
    error: typeof console.error;
    warn: typeof console.warn;
    info: typeof console.info;
  } | null>(null);
  const { meetings, userPreferences, loadMeetings, loadUserPreferences } = useAppStore();

  // 添加日志
  const addLog = (level: DebugLog['level'], message: string, data?: any) => {
    const newLog: DebugLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      
      // 1. 检查IndexedDB可用性（iOS Safari兼容性）
      addLog('info', '检查IndexedDB可用性...');
      try {
        const isIDBAvailable = await (await import('../lib/database')).DatabaseService.isIndexedDBAvailable();
        if (isIDBAvailable) {
          addLog('success', 'IndexedDB可用');
        } else {
          addLog('error', 'IndexedDB不可用 - iOS Safari可能处于隐私模式或存储被禁用');
        }
      } catch (idbError) {
        addLog('error', 'IndexedDB检查失败', idbError);
      }
      
      // 2. 检查网络连接状态
      addLog('info', `网络状态: ${navigator.onLine ? '在线' : '离线'}`);
      if (!navigator.onLine) {
        addLog('warn', '设备处于离线状态，可能影响数据加载');
      }
      
      // 3. 测试JSON文件访问
      addLog('info', '测试会议数据文件访问...');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('/io_connect_china_2025_workshops.json', {
          signal: controller.signal,
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          addLog('success', `JSON文件访问成功 (状态: ${response.status})`);
          
          // 检查响应内容
          const contentType = response.headers.get('content-type');
          addLog('info', `响应类型: ${contentType || '未知'}`);
          
          const textData = await response.text();
          if (textData && textData.trim()) {
            addLog('success', `JSON文件大小: ${(textData.length / 1024).toFixed(2)} KB`);
            
            try {
              const jsonData = JSON.parse(textData);
              if (Array.isArray(jsonData)) {
                addLog('success', `JSON解析成功，包含 ${jsonData.length} 条记录`);
              } else if (jsonData && jsonData.meetings && Array.isArray(jsonData.meetings)) {
                addLog('success', `JSON解析成功，版本: ${jsonData.version || '未知'}，包含 ${jsonData.meetings.length} 条记录`);
              } else {
                addLog('warn', 'JSON格式异常，数据结构不符合预期');
              }
            } catch (parseError) {
              addLog('error', 'JSON解析失败', parseError);
            }
          } else {
            addLog('error', 'JSON文件为空或无法读取内容');
          }
        } else {
          addLog('error', `JSON文件访问失败 (状态: ${response.status})`);
        }
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          addLog('error', 'JSON文件加载超时（5秒）');
        } else {
          addLog('error', 'JSON文件访问异常', fetchError);
        }
      }
      
      // 4. 检查存储配额（iOS Safari限制）
      addLog('info', '检查存储配额...');
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          const usedMB = ((estimate.usage || 0) / 1024 / 1024).toFixed(2);
          const quotaMB = ((estimate.quota || 0) / 1024 / 1024).toFixed(2);
          addLog('info', `存储使用: ${usedMB}MB / ${quotaMB}MB`);
          
          if (estimate.quota && estimate.usage && estimate.usage / estimate.quota > 0.8) {
            addLog('warn', '存储空间使用率超过80%，可能影响数据写入');
          }
        } else {
          addLog('warn', '无法获取存储配额信息（可能是iOS Safari限制）');
        }
      } catch (storageError) {
        addLog('warn', '存储配额检查失败', storageError);
      }
      
      // 5. 加载用户偏好设置
      addLog('info', '加载用户偏好设置...');
      try {
        await loadUserPreferences();
        addLog('success', '用户偏好设置加载完成');
      } catch (prefError) {
        addLog('error', '用户偏好设置加载失败', prefError);
      }
      
      // 6. 加载会议数据（详细监控）
      addLog('info', '开始加载会议数据...');
      try {
        // 检查数据库是否已初始化
        const { DatabaseService } = await import('../lib/database');
        const meetings = await DatabaseService.getAllMeetings();
        
        if (meetings.length === 0) {
          addLog('warn', '数据库中无会议数据，尝试从JSON文件导入...');
          
          // 尝试导入数据
          const { DataImportService } = await import('../lib/dataImport');
          await DataImportService.loadMeetingsFromFile();
          addLog('success', '会议数据导入完成');
          
          // 重新获取数据
          const newMeetings = await DatabaseService.getAllMeetings();
          addLog('success', `成功加载 ${newMeetings.length} 个会议`);
        } else {
          addLog('success', `从数据库加载 ${meetings.length} 个会议`);
        }
        
        await loadMeetings();
        addLog('success', '会议数据加载完成');
      } catch (meetingError) {
        addLog('error', '会议数据加载失败', meetingError);
        
        // iOS Safari特定错误分析
        if (meetingError.message.includes('QuotaExceededError')) {
          addLog('error', 'iOS Safari存储配额不足，建议清理浏览器数据或关闭隐私模式');
        } else if (meetingError.message.includes('InvalidStateError')) {
          addLog('error', 'iOS Safari数据库状态异常，建议刷新页面重试');
        } else if (meetingError.message.includes('UnknownError')) {
          addLog('error', 'iOS Safari数据库访问被阻止，请检查浏览器设置中的存储权限');
        } else if (meetingError.message.includes('NetworkError')) {
          addLog('error', 'iOS网络连接问题，请检查WiFi或移动数据连接');
        }
      }
      
      addLog('success', '数据重新加载完成');
    } catch (error) {
      addLog('error', '数据重新加载失败', error);
    }
  };

  // 会议数据诊断
  const diagnoseMeetingData = async () => {
    try {
      addLog('info', '开始会议数据诊断...');
      
      // 1. 检查JSON文件可访问性
      addLog('info', '步骤1: 检查JSON文件可访问性');
      try {
        const response = await fetch('/io_connect_china_2025_workshops.json', {
          method: 'HEAD',
          cache: 'no-cache'
        });
        if (response.ok) {
          addLog('success', '✅ JSON文件可访问');
        } else {
          addLog('error', `❌ JSON文件访问失败 (${response.status})`);
          return;
        }
      } catch (error) {
        addLog('error', '❌ JSON文件访问异常', error);
        return;
      }
      
      // 2. 验证数据格式
      addLog('info', '步骤2: 验证数据格式');
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
        
        if (isValidFormat && recordCount > 0) {
          addLog('success', `✅ 数据格式有效，包含 ${recordCount} 条记录`);
        } else {
          addLog('error', '❌ 数据格式无效或为空');
          return;
        }
      } catch (error) {
        addLog('error', '❌ 数据格式验证失败', error);
        return;
      }
      
      // 3. 测试数据库写入权限
      addLog('info', '步骤3: 测试数据库写入权限');
      try {
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
        addLog('success', '✅ 数据库写入权限正常');
        
        // 清理测试数据
        const { db } = await import('../lib/database');
        await db.meetings.delete(testMeeting.id);
        addLog('info', '测试数据已清理');
      } catch (error) {
        addLog('error', '❌ 数据库写入权限测试失败', error);
        
        if (error.name === 'QuotaExceededError') {
          addLog('error', '💡 解决方案: 清理浏览器数据或关闭隐私模式');
        } else if (error.name === 'InvalidStateError') {
          addLog('error', '💡 解决方案: 刷新页面重试');
        } else if (error.name === 'UnknownError') {
          addLog('error', '💡 解决方案: 检查浏览器存储权限设置');
        }
        return;
      }
      
      // 4. 检查存储配额
      addLog('info', '步骤4: 检查存储配额');
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          const usedMB = ((estimate.usage || 0) / 1024 / 1024).toFixed(2);
          const quotaMB = ((estimate.quota || 0) / 1024 / 1024).toFixed(2);
          const usagePercent = estimate.quota ? ((estimate.usage || 0) / estimate.quota * 100).toFixed(1) : '未知';
          
          addLog('info', `存储使用情况: ${usedMB}MB / ${quotaMB}MB (${usagePercent}%)`);
          
          if (estimate.quota && estimate.usage && estimate.usage / estimate.quota > 0.9) {
            addLog('warn', '⚠️ 存储空间使用率超过90%，建议清理数据');
          } else {
            addLog('success', '✅ 存储空间充足');
          }
        } else {
          addLog('warn', '⚠️ 无法获取存储配额信息（iOS Safari限制）');
        }
      } catch (error) {
        addLog('warn', '存储配额检查失败', error);
      }
      
      addLog('success', '🎉 会议数据诊断完成');
    } catch (error) {
      addLog('error', '会议数据诊断失败', error);
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

  // 全局console捕获
  useEffect(() => {
    if (!visible) return;

    // 保存原始console方法
    originalConsole.current = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };

    // 重写console方法
    console.log = (...args: any[]) => {
      originalConsole.current?.log(...args);
      addLog('info', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    console.error = (...args: any[]) => {
      originalConsole.current?.error(...args);
      addLog('error', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    console.warn = (...args: any[]) => {
      originalConsole.current?.warn(...args);
      addLog('warn', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    console.info = (...args: any[]) => {
      originalConsole.current?.info(...args);
      addLog('info', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    addLog('success', '全局console捕获已启用');

    // 清理函数：恢复原始console方法
    return () => {
      if (originalConsole.current) {
        console.log = originalConsole.current.log;
        console.error = originalConsole.current.error;
        console.warn = originalConsole.current.warn;
        console.info = originalConsole.current.info;
        originalConsole.current = null;
      }
    };
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

  if (!visible) return null;

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
                  onClick={diagnoseMeetingData}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                >
                  <AlertTriangle className="w-4 h-4" />
                  会议数据诊断
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

              {/* 会议数据状态 */}
              <div className="bg-gray-50 p-3 rounded">
                <h3 className="font-medium text-gray-800 mb-2">会议数据状态</h3>
                <div className="text-sm space-y-1">
                  <p>会议数量: <span className={`font-medium ${meetings?.length ? 'text-green-600' : 'text-red-600'}`}>{meetings?.length || 0}</span></p>
                  <p>数据版本: <span className="font-medium">{localStorage.getItem('dataVersion') || '未知'}</span></p>
                  <p>最后更新: <span className="font-medium">{localStorage.getItem('lastDataUpdate') ? new Date(localStorage.getItem('lastDataUpdate')!).toLocaleString('zh-CN') : '未知'}</span></p>
                  <p>数据源文件: <span className="font-medium">io_connect_china_2025_workshops.json</span></p>
                </div>
              </div>

              {/* 应用状态 */}
              <div className="bg-gray-50 p-3 rounded">
                <h3 className="font-medium text-gray-800 mb-2">应用状态</h3>
                <div className="text-sm space-y-1">
                  <p>用户偏好: <span className={`font-medium ${userPreferences ? 'text-green-600' : 'text-red-600'}`}>{userPreferences ? '已加载' : '未加载'}</span></p>
                  <p>网络状态: <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>{isOnline ? '在线' : '离线'}</span></p>
                  <p>设备类型: <span className="font-medium">{getDeviceInfo().platform}</span></p>
                  <p>浏览器: <span className="font-medium">{getDeviceInfo().userAgent.includes('Safari') && getDeviceInfo().userAgent.includes('Mobile') ? 'iOS Safari' : '其他'}</span></p>
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
            <div className="p-4 space-y-4 overflow-y-auto h-full">
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
                  <p>通知权限: {typeof Notification !== 'undefined' ? Notification.permission : '不可用'}</p>
                </div>
              </div>
              
              {/* iOS设备特定信息 */}
              {getDeviceInfo().userAgent.includes('Safari') && getDeviceInfo().userAgent.includes('Mobile') && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                  <h3 className="font-medium text-yellow-800 mb-2">iOS Safari 特定信息</h3>
                  <div className="space-y-2 text-sm text-yellow-700">
                    <div className="font-medium">常见问题及解决方案:</div>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>QuotaExceededError:</strong> 存储空间不足，尝试清理Safari数据或关闭隐私模式</li>
                      <li><strong>InvalidStateError:</strong> 数据库状态异常，刷新页面重试</li>
                      <li><strong>UnknownError:</strong> 检查Safari的存储权限设置</li>
                      <li><strong>网络缓存问题:</strong> 使用无痕浏览模式或清除网站数据</li>
                      <li><strong>JSON解析失败:</strong> 检查网络连接，确保文件完整下载</li>
                    </ul>
                    
                    <div className="mt-3 p-2 bg-yellow-100 rounded text-xs">
                      <strong>建议操作顺序:</strong><br/>
                      1. 点击"会议数据诊断"按钮进行详细检查<br/>
                      2. 如有错误，按照提示的解决方案操作<br/>
                      3. 清除缓存后重新加载数据<br/>
                      4. 如问题持续，尝试使用无痕模式
                    </div>
                  </div>
                </div>
              )}
              
              {/* 存储兼容性检查 */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                <h3 className="font-medium text-blue-800 mb-2">存储兼容性检查</h3>
                <div className="space-y-1 text-sm text-blue-700">
                  <div>IndexedDB: {storageInfo?.indexedDB.available ? '✅ 支持' : '❌ 不支持'}</div>
                  <div>LocalStorage: {storageInfo?.localStorage.available ? '✅ 支持' : '❌ 不支持'}</div>
                  <div>Storage API: {'storage' in navigator ? '✅ 支持' : '❌ 不支持'}</div>
                  <div>Service Worker: {'serviceWorker' in navigator ? '✅ 支持' : '❌ 不支持'}</div>
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