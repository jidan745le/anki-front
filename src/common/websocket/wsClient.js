import axios from 'axios';
import { EventEmitter } from 'events';
import { io } from 'socket.io-client';
import { WS_BASE_URL } from '../util/env';

class WebSocketClient {
  constructor(url) {
    this.socket = null;
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.client = new EventEmitter();
  }

  async refreshToken() {
    const res = await axios.get('/api/user/refresh', {
      params: {
        refresh_token: localStorage.getItem('refreshToken'),
      },
    });
    localStorage.setItem('token', res.data.data.access_token);
    localStorage.setItem('refreshToken', res.data.data.refresh_token);

    // 如果响应中包含用户ID，也要更新
    if (res.data.data.userId) {
      localStorage.setItem('userId', res.data.data.userId);
    }

    return res;
  }

  async connect() {
    const token = localStorage.getItem('token');
    console.log('connect', token, this.socket, 'token');

    // if (!token || this.socket) {
    //   console.log('connect !token || this.socket', token, this.socket, 'token');
    //   if (!token && !['/login', '/signup'].includes(window.location.pathname)) {
    //     localStorage.removeItem('token');
    //     window.location.href = '/login';
    //   }
    //   return;
    // }
    console.log(new Error().stack, 'stack');
    if (this.socket) {
      console.log('connect 1', token, this.socket, 'token');
      return;
    }
    console.log('start connect', token, this.socket, 'token');

    this.socket = io(this.url, {
      auth: {
        token: token,
      },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnection: false, // 禁用自动重连，我们自己处理
      timeout: 5000,
    });
    console.log('start connect 2', token, this.socket, 'token');

    this.socket.on('connect', () => {
      this.client.emit('connect');
      console.log('Connected to socket server');
      this.reconnectAttempts = 0; // 重置重连次数
    });

    this.socket.on('disconnect', e => {
      this.client.emit('disconnect');
      const token = localStorage.getItem('token');
      console.log('disconnect', token, 'token', e);
      if (token) {
        setTimeout(() => this.connect(), 1000);
      }

      console.log('Disconnected from socket server');
    });

    this.socket.on('auth_success', data => {
      console.log('Authentication successful', data);
      this.userId = data.userId;
      this.client.emit('auth_success', data);
    });

    this.socket.on('error', async error => {
      this.client.emit('errorMessage');

      console.error('Socket error:', error, 'error.type', error.type);
      if (error.type === 'unauthorized') {
        console.log('unauthorized 尝试刷新 token');
        // 尝试刷新 token
        const refreshSuccess = await this.refreshToken();

        if (refreshSuccess.status === 200 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          // 断开当前连接
          this.disconnect();
          // 使用新 token 重新连接
          setTimeout(() => this.connect(), 1000);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userId');
          window.location.href = '/login';
        }
      } else {
        // 断开当前连接
        console.log('reconnect');
        this.disconnect();
        // 使用新 token 重新连接
        // setTimeout(() => this.connect(), 1000);
      }
    });
  }

  disconnect() {
    console.log('disconnect fn', this.socket, 'socket');
    if (this.socket) {
      console.log('disconnect fn 2', this.socket, 'socket');
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const wsClient = new WebSocketClient(WS_BASE_URL);
export default wsClient;
