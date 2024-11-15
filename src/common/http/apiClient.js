import axios from 'axios';
import { set } from 'lodash';
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
    baseURL:"",
});

// 添加请求拦截器
apiClient.interceptors.request.use(
    (config) => {
        // 从 localStorage 获取 token
        const token = localStorage.getItem('token');

        // 如果 token 存在，则设置 Authorization 头
        if (token) {
            config.headers['authorization'] = `Bearer ${token}`;
        }

        return config; // 返回配置以继续请求
    },
    (error) => {
        // 处理请求错误
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        // 处理响应数据
        return response; // 返回响应数据以继续请求
    },
    (error) => {
        // 处理请求错误
        console.log("config", error)
        if (error.response && error.response.status === 401) {
             window.location.href = '/login';            
        }

        return Promise.reject(error);
    }
);

export default apiClient;