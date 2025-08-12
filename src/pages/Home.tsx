import { useEffect } from 'react';
import Layout from '../components/Layout';
import MeetingList from './MeetingList';
import { trackPageView } from '../utils/analytics';

const Home = () => {
  // 追踪页面浏览
  useEffect(() => {
    trackPageView('首页', '/');
  }, []);

  return (
    <Layout>
      <MeetingList />
    </Layout>
  );
};

export default Home;