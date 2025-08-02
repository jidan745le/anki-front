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
    this.socketId = null; // 添加全局socketId存储
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

  // 获取socketId的方法
  getSocketId() {
    return this.socketId;
  }

  // 设置socketId的方法
  setSocketId(socketId) {
    this.socketId = socketId;
    // 同时保存到sessionStorage用于页面刷新后恢复
    if (socketId) {
      sessionStorage.setItem('socketId', socketId);
    } else {
      sessionStorage.removeItem('socketId');
    }
  }

  async connect() {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    // 修改检查逻辑：只有当socket存在且已连接时才返回
    if (this.socket && this.socket.connected) {
      console.log('connected and connect return', this.socket, 'socket');
      return;
    }

    // 如果socket存在但未连接，先清理
    if (this.socket && !this.socket.connected) {
      this.socket.removeAllListeners();
      this.socket.io.engine.removeAllListeners();
      this.socket = null;
    }

    console.log('start connect', token, this.socket, 'token');
    const socketUrl = `${this.url}?userId=${encodeURIComponent(userId)}`;

    this.socket = io(socketUrl, {
      auth: {
        token: token,
        userId: localStorage.getItem('userId'), // 添加userId到auth对象
      },
      transports: ['websocket', 'polling'],
      extraHeaders: {
        Authorization: `Bearer ${token}`,
        'X-User-ID': localStorage.getItem('userId'),
      },
      reconnection: false, // 禁用自动重连，我们自己处理
      timeout: 5000,
    });
    console.log('start connect 2', token, this.socket, 'token');

    this.socket.on('connect', () => {
      this.client.emit('connect');
      console.log('Connected to socket server');
      this.reconnectAttempts = 0; // 重置重连次数

      // 获取并存储socketId
      if (this.socket?.id) {
        this.setSocketId(this.socket.id);
        console.log('Socket ID saved:', this.socket.id);
      }
    });

    this.socket.on('disconnect', e => {
      this.client.emit('disconnect');
      const token = localStorage.getItem('token');
      console.log('disconnect', token, 'token', e);

      // 清除socketId
      this.setSocketId(null);

      if (token) {
        setTimeout(() => this.connect(), 1000);
      }

      console.log('Disconnected from socket server');
    });

    this.socket.on('auth_success', data => {
      console.log('Authentication successful', data);
      this.userId = data.userId;

      // 如果auth_success事件中包含socketId，则使用它
      if (data.socketId) {
        this.setSocketId(data.socketId);
        console.log('Socket ID from auth_success:', data.socketId);
      }

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
    console.log('disconnect', this.socket, 'socket');
    if (this.socket) {
      console.log('disconnect 2', this.socket, 'socket');
      this.socket.disconnect();
      this.socket = null;
    }
    // 清除socketId
    this.setSocketId(null);
  }
}

export const wsClient = new WebSocketClient(WS_BASE_URL);
export default wsClient;
