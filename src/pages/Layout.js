import { Avatar, Descriptions, message, Popover, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../common/hooks/useI18n';
import apiClient from '../common/http/apiClient';
import wsClient from '../common/websocket/wsClient';
import LanguageSwitcher from '../component/LanguageSwitcher';
import styles from './style.module.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const { t } = useI18n();

  // 获取用户信息
  const fetchUserInfo = async () => {
    setUserLoading(true);
    try {
      const response = await apiClient.get('/user/profile');
      if (response.data.success) {
        setUserInfo(response.data.data);
        console.log(response.data.data, 'response.data.data');
        return response.data.data;
      } else {
        message.error(t('errors.userInfoFailed'));
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      // 如果是401错误，可能是token过期，不显示错误信息
      if (error.response?.status !== 401) {
        message.error(t('errors.userInfoFailed'));
      }
      return Promise.reject(error);
    } finally {
      setUserLoading(false);
    }
  };

  // 在组件挂载时获取用户信息（如果用户已登录）
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !['/login', '/signup'].includes(location.pathname)) {
      fetchUserInfo()
        .then(() => {
          wsClient.connect();
        })
        .catch(e => {
          console.log('fetchUserInfo error', e);
        });
    }
  }, [location.pathname]);

  const logout = async () => {
    wsClient.disconnect();
    await apiClient
      .post(`/user/logout`)
      .then(res => {
        const data = res.data;
        if (data.code === 200) {
          if (data.success) {
            message.success(data.data.toString());
            navigate('/');
          } else {
            message.error(data.message);
          }
        }
      })
      .catch(err => {
        message.error(err.message);
      });
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUserInfo(null);
    navigate('/login');
  };

  // 用户信息悬浮框内容
  const userPopoverContent = () => {
    if (userLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', width: '300px' }}>
          <Spin size="large" />
        </div>
      );
    }

    if (!userInfo) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', width: '300px' }}>
          <p>{t('errors.userInfoFailed')}</p>
        </div>
      );
    }

    return (
      <div style={{ width: '350px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <Avatar size={48} style={{ backgroundColor: '#1890ff', fontSize: '18px' }}>
            {userInfo.username?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          <h4 style={{ marginTop: '8px', marginBottom: '4px' }}>{userInfo.username}</h4>
          {userInfo.email && (
            <p style={{ color: '#666', margin: 0, fontSize: '12px' }}>{userInfo.email}</p>
          )}
        </div>

        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label={t('user.username')}>
            {userInfo.username || 'N/A'}
          </Descriptions.Item>
          {userInfo.email && (
            <Descriptions.Item label={t('user.email')}>{userInfo.email}</Descriptions.Item>
          )}
          {userInfo.createdAt && (
            <Descriptions.Item label={t('user.memberSince')}>
              {new Date(userInfo.createdAt).toLocaleDateString()}
            </Descriptions.Item>
          )}
          {userInfo.totalDecks !== undefined && (
            <Descriptions.Item label={t('user.totalDecks')}>
              {userInfo.totalDecks}
            </Descriptions.Item>
          )}
          {userInfo.totalCards !== undefined && (
            <Descriptions.Item label={t('user.totalCards')}>
              {userInfo.totalCards}
            </Descriptions.Item>
          )}
          {userInfo.studiedToday !== undefined && (
            <Descriptions.Item label={t('user.studiedToday')}>
              {userInfo.studiedToday} cards
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>
    );
  };

  return (
    <div>
      <nav className={styles.navbar}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#e74c3c',
              borderRadius: '10%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px',
            }}
          >
            <span>📦</span>
          </div>
          <span
            style={{
              marginLeft: '10px',
              fontFamily: 'Arial, sans-serif',
              fontSize: '16px',
              color: '#333',
            }}
          >
            {t('nav.brand')}
          </span>
        </div>
        {['/login', '/signup'].includes(location.pathname) ? null : (
          <ul className={styles.navLeft}>
            <li>
              <a onClick={() => navigate('/decks')}>{t('nav.myDecks')}</a>
            </li>
            <li>
              <a onClick={() => navigate('/shared-decks')}>{t('nav.sharedDecks')}</a>
            </li>
            {/* <li>
              <a onClick={() => navigate('/i18n-demo')}>{t('nav.i18nDemo', 'I18n Demo')}</a>
            </li> */}
            {/* <li>
              <a>{t('nav.search')}</a>
            </li> */}
          </ul>
        )}
        <ul className={styles.navRight}>
          {['/login', '/signup'].includes(location.pathname) ? (
            <>
              <li>
                <LanguageSwitcher mode="select" size="small" />
              </li>
              <li>
                <a
                  onClick={() => {
                    navigate(location.pathname == '/signup' ? '/login' : '/signup');
                  }}
                >
                  {location.pathname == '/signup' ? t('nav.login') : t('nav.signup')}
                </a>
              </li>
            </>
          ) : (
            <>
              <li>
                <LanguageSwitcher mode="select" size="small" />
              </li>
              <li>
                <Popover
                  content={userPopoverContent}
                  title={t('nav.accountInfo')}
                  trigger="click"
                  placement="bottomRight"
                  onOpenChange={visible => {
                    if (visible && !userInfo && !userLoading) {
                      fetchUserInfo();
                    }
                  }}
                >
                  <a style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {userInfo && (
                      <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                        {userInfo.username?.[0]?.toUpperCase() || 'U'}
                      </Avatar>
                    )}
                    {t('nav.account')}
                  </a>
                </Popover>
              </li>
              <li>
                <a onClick={logout}>{t('nav.logout')}</a>
              </li>
            </>
          )}
        </ul>
      </nav>
      <main>{children}</main>
    </div>
  );
};

export default Layout;
