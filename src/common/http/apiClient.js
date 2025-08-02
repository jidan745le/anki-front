import { message } from 'antd';
import axios from 'axios';
import { API_BASE_URL, log } from '../util/env';

// 创建 Axios 实例
const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'development' ? '/api' : API_BASE_URL,
});

// 打印API配置信息
log.debug('API Client initialized with baseURL:', apiClient.defaults.baseURL);

// 添加请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token');
    // 从 localStorage 获取 userId
    const userId = localStorage.getItem('userId');

    // 如果 token 存在，则设置 Authorization 头
    if (token) {
      config.headers['authorization'] = `Bearer ${token}`;
    }

    // 如果 userId 存在，则设置 X-User-ID 头用于nginx会话一致性
    if (userId) {
      config.headers['X-User-ID'] = userId;
    }

    return config; // 返回配置以继续请求
  },
  error => {
    // 处理请求错误
    return Promise.reject(error);
  }
);

let refreshing = false;
const queue = [];

apiClient.interceptors.response.use(
  response => {
    // 处理响应数据
    return response; // 返回响应数据以继续请求
  },
  async error => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(error);
    }
    // 处理请求错误
    console.log('config', error);
    let { data, config } = error.response;
    if (refreshing) {
      return new Promise(resolve => {
        queue.push({
          config,
          resolve,
        });
      });
    }

    if (data.statusCode === 401 && !config.url.includes('/user/refresh')) {
      refreshing = true;
      const res = await refreshToken().catch(e => {
        console.log('refreshToken error', e);
        return Promise.resolve(e);
      });
      refreshing = false;
      console.log('refreshToken', res);
      if (res.status === 200) {
        queue.forEach(({ config, resolve }) => {
          resolve(apiClient(config));
        });

        return apiClient(config);
      } else {
        console.log('401');
        // 清理所有登录相关的本地存储
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        message.error('登录过期，请重新登录');
        // window.location.href = '/login';
        return Promise.reject(res.data);
      }
    }

    return Promise.reject(error);
  }
);

async function refreshToken() {
  const res = await axios.get(API_BASE_URL + '/user/refresh', {
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

export default apiClient;
