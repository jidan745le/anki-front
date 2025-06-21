import { message } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../common/http/apiClient';
import wsClient from '../../common/websocket/wsClient';
import './style.less';

const Login = () => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const popupRef = useRef(null);

  const handleSubmit = e => {
    e.preventDefault();
    apiClient
      .post(`/user/login`, { username: userName, password: password })
      .then(res => {
        const data = res.data;
        if (data.code === 200) {
          if (data.success) {
            localStorage.setItem('token', res.headers.token);
            localStorage.setItem('refreshToken', res.headers.refreshtoken);
            wsClient.connect();
            // message.success('Login successful');
            // navigate('/');
          } else {
            console.log('Login failed:', data);
            message.error(data.message);
          }
        }
      })
      .catch(err => {
        message.error(err.message);
      });
  };

  useEffect(() => {
    console.log('useEffect login');
  }, []);

  const handleMessage = useCallback(event => {
    if (event.data && event.data.isOAuthVerified) {
      popupRef.current.close();
      window.removeEventListener('message', handleMessage);

      console.log(event, event.data);
      if (event.data.needRegister) {
        navigate('/oauth/register', {
          state: { email: event.data.email, authUserId: event.data.authUserId },
        });
        return;
      }

      if (event.data.token) {
        console.log(event.data);
        // 存储 token
        localStorage.setItem('token', event.data.token);
        localStorage.setItem('refreshToken', event.data.refreshToken);

        // 连接 WebSocket
        wsClient.connect();

        // 跳转到首页
        message.success('Login successful');
        navigate('/');

        // 清理事件监听器
      }
    }
  }, []);

  const handleGoogleLogin = () => {
    // 计算窗口位置，使其居中
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    // 打开一个新窗口进行 Google 登录
    popupRef.current = window.open(
      '/api/oauth/google', // 你的后端 Google 登录 URL
      'Google Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    popupRef.current.addEventListener('beforeunload', () => {
      window.removeEventListener('message', handleMessage);
    });

    window.addEventListener('message', handleMessage);
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="userName">Username:</label>
          <input
            type="userName"
            id="userName"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>

        {/* Google 登录按钮 */}
        <div className="social-login">
          <button type="button" className="google-login-btn" onClick={handleGoogleLogin}>
            <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" />
            Sign in with Google
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
