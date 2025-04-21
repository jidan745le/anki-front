import axios from 'axios';
import { io } from 'socket.io-client';

class WebSocketClient {
  constructor(url) {
    this.socket = null;
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  async refreshToken() {
    const res = await axios.get('/api/user/refresh', {
      params: {
        refresh_token: localStorage.getItem('refreshToken'),
      },
    });
    localStorage.setItem('token', res.data.data.access_token);
    localStorage.setItem('refreshToken', res.data.data.refresh_token);
    return res;
  }

  async connect() {
    const token = localStorage.getItem('token');
    console.log(token, this.socket, 'token');

    if (!token || this.socket) {
      if (!token && !['/login', '/signup'].includes(window.location.pathname)) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return;
    }

    this.socket = io(this.url, {
      auth: {
        token: token,
      },
      reconnection: false, // 禁用自动重连，我们自己处理
      timeout: 5000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.reconnectAttempts = 0; // 重置重连次数
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    this.socket.on('error', async error => {
      console.error('Socket error:', error);
      if (error.type === 'unauthorized') {
        // 尝试刷新 token
        const refreshSuccess = await this.refreshToken();

        if (refreshSuccess && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          // 断开当前连接
          this.disconnect();
          // 使用新 token 重新连接
          setTimeout(() => this.connect(), 1000);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const wsClient = new WebSocketClient('');
export default wsClient;
