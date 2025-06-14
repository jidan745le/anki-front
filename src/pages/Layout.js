import { Avatar, Descriptions, message, Popover, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../common/http/apiClient';
import wsClient from '../common/websocket/wsClient';
import styles from './style.module.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [userLoading, setUserLoading] = useState(false);

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
        message.error('Failed to get user information');
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      // 如果是401错误，可能是token过期，不显示错误信息
      if (error.response?.status !== 401) {
        message.error('Failed to get user information');
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
          <p>Failed to load user information</p>
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
          <Descriptions.Item label="Username">{userInfo.username || 'N/A'}</Descriptions.Item>
          {userInfo.email && <Descriptions.Item label="Email">{userInfo.email}</Descriptions.Item>}
          {userInfo.createdAt && (
            <Descriptions.Item label="Member Since">
              {new Date(userInfo.createdAt).toLocaleDateString()}
            </Descriptions.Item>
          )}
          {userInfo.totalDecks !== undefined && (
            <Descriptions.Item label="Total Decks">{userInfo.totalDecks}</Descriptions.Item>
          )}
          {userInfo.totalCards !== undefined && (
            <Descriptions.Item label="Total Cards">{userInfo.totalCards}</Descriptions.Item>
          )}
          {userInfo.studiedToday !== undefined && (
            <Descriptions.Item label="Studied Today">
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
            MyANKI
          </span>
        </div>
        {['/login', '/signup'].includes(location.pathname) ? null : (
          <ul className={styles.navLeft}>
            <li>
              <a onClick={() => navigate('/decks')}>My Decks</a>
            </li>
            <li>
              <a onClick={() => navigate('/shared-decks')}>Shared Decks</a>
            </li>
            <li>
              <a>search</a>
            </li>
          </ul>
        )}
        <ul className={styles.navRight}>
          {['/login', '/signup'].includes(location.pathname) ? (
            <li>
              <a
                onClick={() => {
                  navigate(location.pathname == '/signup' ? '/login' : '/signup');
                }}
              >
                {location.pathname == '/signup' ? 'Login' : 'Sign Up'}
              </a>
            </li>
          ) : (
            <>
              <li>
                <Popover
                  content={userPopoverContent}
                  title="Account Information"
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
                    Account
                  </a>
                </Popover>
              </li>
              <li>
                <a onClick={logout}>Log Out</a>
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
