/**
 * iOS设备检测工具函数
 * 用于判断当前设备是否为iOS设备
 */

/**
 * 检测当前设备是否为iOS设备
 * @returns {boolean} 如果是iOS设备返回true，否则返回false
 */
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() || '';

  // 检测iOS设备的多种方式
  const isIOS = 
    // 检测iPhone
    /iphone/.test(userAgent) ||
    // 检测iPad
    /ipad/.test(userAgent) ||
    // 检测iPod
    /ipod/.test(userAgent) ||
    // 检测iOS平台
    /iphone|ipad|ipod/.test(platform) ||
    // 检测Safari on iOS (包括iPad上的桌面模式)
    (/safari/.test(userAgent) && /mobile/.test(userAgent)) ||
    // 检测iPad Pro在桌面模式下的情况
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /macintosh/.test(userAgent));

  return isIOS;
};

/**
 * 检测当前设备是否为iPhone
 * @returns {boolean} 如果是iPhone返回true，否则返回false
 */
export const isIPhone = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone/.test(userAgent);
};

/**
 * 检测当前设备是否为iPad
 * @returns {boolean} 如果是iPad返回true，否则返回false
 */
export const isIPad = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() || '';

  return (
    /ipad/.test(userAgent) ||
    /ipad/.test(platform) ||
    // iPad Pro在桌面模式下的检测
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /macintosh/.test(userAgent))
  );
};

/**
 * 检测当前浏览器是否为Safari
 * @returns {boolean} 如果是Safari返回true，否则返回false
 */
export const isSafari = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  return /safari/.test(userAgent) && !/chrome/.test(userAgent) && !/firefox/.test(userAgent);
};

/**
 * 检测当前是否为iOS Safari
 * @returns {boolean} 如果是iOS Safari返回true，否则返回false
 */
export const isIOSSafari = (): boolean => {
  return isIOSDevice() && isSafari();
};

/**
 * 获取iOS版本号
 * @returns {string | null} iOS版本号，如果不是iOS设备返回null
 */
export const getIOSVersion = (): string | null => {
  if (!isIOSDevice()) {
    return null;
  }

  const userAgent = window.navigator.userAgent;
  const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  
  if (match) {
    const major = match[1];
    const minor = match[2];
    const patch = match[3] || '0';
    return `${major}.${minor}.${patch}`;
  }

  return null;
};

/**
 * 获取设备信息
 * @returns {object} 设备信息对象
 */
export const getDeviceInfo = () => {
  return {
    isIOS: isIOSDevice(),
    isIPhone: isIPhone(),
    isIPad: isIPad(),
    isSafari: isSafari(),
    isIOSSafari: isIOSSafari(),
    iosVersion: getIOSVersion(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
    platform: typeof window !== 'undefined' ? window.navigator.platform : '',
    maxTouchPoints: typeof window !== 'undefined' ? navigator.maxTouchPoints : 0,
    screenWidth: typeof window !== 'undefined' ? window.screen.width : 0,
    screenHeight: typeof window !== 'undefined' ? window.screen.height : 0,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0
  };
};