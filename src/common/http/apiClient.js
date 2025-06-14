import { message } from 'antd';
import axios from 'axios';
// import add from  "../util/math"
// import { toString,toNumber,bbb,ccc } from '../util/util';
// const aaa = require("../util/aaa")
// aaa.a = 2
// console.log(aaa,toString(add(aaa.a,1)), "aaa")
// setTimeout(() => {
//     const aaa = require("../util/aaa")
//     console.log(aaa)

// },1000)
// 创建 Axios 实例
const apiClient = axios.create({
  baseURL: '/api',
});

// 添加请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token');

    // 如果 token 存在，则设置 Authorization 头
    if (token) {
      config.headers['authorization'] = `Bearer ${token}`;
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
        message.error('登录过期，请重新登录');
        window.location.href = '/login';
        return Promise.reject(res.data);
      }
    }

    return Promise.reject(error);
  }
);

async function refreshToken() {
  const res = await axios.get('/api/user/refresh', {
    params: {
      refresh_token: localStorage.getItem('refreshToken'),
    },
  });
  localStorage.setItem('token', res.data.data.access_token);
  localStorage.setItem('refreshToken', res.data.data.refresh_token);
  return res;
}

export default apiClient;
