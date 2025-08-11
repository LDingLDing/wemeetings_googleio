import React, { useState } from 'react';
import { Modal, Button } from 'antd-mobile';
import { 
  Calendar, 
  Bell, 
  Download, 
  Smartphone, 
  Volume2, 
  Vibrate,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface FirstTimeGuideProps {
  visible: boolean;
  onClose: () => void;
}

const FirstTimeGuide: React.FC<FirstTimeGuideProps> = ({ visible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '欢迎使用大会助手',
      icon: <Calendar className="w-16 h-16 text-blue-500 mx-auto mb-4" />,
      content: (
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            这是一个专为开发者大会设计的智能会议管理应用
          </p>
          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>浏览和预约感兴趣的会议</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>智能提醒，不错过重要会议</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>离线访问，随时随地使用</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '安装到桌面',
      icon: <Download className="w-16 h-16 text-green-500 mx-auto mb-4" />,
      content: (
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            将应用安装到您的设备桌面，获得更好的使用体验
          </p>
          <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <Smartphone className="w-4 h-4 text-blue-500 mr-2" />
              <span>更快的启动速度</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>离线访问功能</span>
            </div>
            <div className="flex items-center">
              <Bell className="w-4 h-4 text-orange-500 mr-2" />
              <span>原生通知体验</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 稍后会出现安装提示，建议点击"安装"获得最佳体验
            </p>
          </div>
        </div>
      )
    },
    {
      title: '开启通知权限',
      icon: <Bell className="w-16 h-16 text-orange-500 mx-auto mb-4" />,
      content: (
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            开启通知权限，及时收到会议提醒
          </p>
          <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <Bell className="w-4 h-4 text-orange-500 mr-2" />
              <span>会议开始前自动提醒</span>
            </div>
            <div className="flex items-center">
              <Volume2 className="w-4 h-4 text-purple-500 mr-2" />
              <span>支持声音提醒</span>
            </div>
            <div className="flex items-center">
              <Vibrate className="w-4 h-4 text-red-500 mr-2" />
              <span>支持震动提醒</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-xs text-orange-600 dark:text-orange-400">
              💡 稍后会请求通知权限，建议点击"允许"以获得完整功能
            </p>
          </div>
        </div>
      )
    },
    {
      title: '开始使用',
      icon: <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />,
      content: (
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            一切准备就绪！现在您可以：
          </p>
          <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-blue-500 mr-2" />
              <span>浏览会议列表，查看详细信息</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>预约感兴趣的会议</span>
            </div>
            <div className="flex items-center">
              <Bell className="w-4 h-4 text-orange-500 mr-2" />
              <span>在"我的日程"中管理预约</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-xs text-green-600 dark:text-green-400">
              🎉 祝您在开发者大会中收获满满！
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    // 标记首次引导已完成
    localStorage.setItem('firstTimeGuideCompleted', 'true');
    onClose();
  };

  const handleSkip = () => {
    handleFinish();
  };

  return (
    <Modal
      visible={visible}
      content={
        <div className="p-6">
          {/* 步骤指示器 */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-blue-500'
                      : index < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 当前步骤内容 */}
          <div className="text-center">
            {steps[currentStep].icon}
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              {steps[currentStep].title}
            </h2>
            {steps[currentStep].content}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap justify-between items-center gap-3 mt-8">
            <Button
              fill="outline"
              onClick={handleSkip}
              className="text-gray-500 flex-shrink-0"
            >
              跳过引导
            </Button>

            <div className="flex flex-wrap gap-3 min-w-0">
              {currentStep > 0 && (
                <Button
                  fill="outline"
                  onClick={handlePrev}
                  className="flex-shrink-0"
                >
                  上一步
                </Button>
              )}
              <Button
                color="primary"
                onClick={handleNext}
                className="flex items-center flex-shrink-0"
              >
                {currentStep === steps.length - 1 ? (
                  '开始使用'
                ) : (
                  <span className="flex items-center">
                    下一步
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      }
      closeOnMaskClick={false}
      showCloseButton={false}
    />
  );
};

export default FirstTimeGuide;