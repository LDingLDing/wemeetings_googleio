import { SpinLoading } from 'antd-mobile';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="mb-6">
          <img 
            src="/favicon.svg" 
            alt="Logo" 
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            2025 Google开发者大会
          </h1>
          <p className="text-gray-600">
            会议预约管理系统
          </p>
        </div>
        
        <div className="flex flex-col items-center space-y-4">
          <SpinLoading style={{ '--size': '48px', '--color': '#4285F4' }} />
          <p className="text-sm text-gray-500">
            正在加载会议数据...
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;