/**
 * 环境配置工具
 * 统一管理环境变量，提供类型安全的访问方式
 */

// 环境检测
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// API 配置
export const API_BASE_URL = process.env.API_BASE_URL;
export const WS_BASE_URL = process.env.WS_BASE_URL;

// 应用配置
export const APP_NAME = process.env.APP_NAME;
export const VERSION = process.env.VERSION;
export const DEBUG = process.env.DEBUG === 'true';

// 功能开关
export const ENABLE_AI_CHAT = process.env.ENABLE_AI_CHAT === 'true';
export const ENABLE_STREAMING = process.env.ENABLE_STREAMING === 'true';

// 日志工具
export const log = {
  debug: (...args) => {
    if (DEBUG) {
      console.log(`[${APP_NAME}] DEBUG:`, ...args);
    }
  },
  info: (...args) => {
    console.log(`[${APP_NAME}] INFO:`, ...args);
  },
  warn: (...args) => {
    console.warn(`[${APP_NAME}] WARN:`, ...args);
  },
  error: (...args) => {
    console.error(`[${APP_NAME}] ERROR:`, ...args);
  },
};

// 环境信息打印
export const printEnvInfo = () => {
  console.log(`
🚀 ${APP_NAME} v${VERSION}
📦 Environment: ${process.env.NODE_ENV}
🌐 API Base URL: ${API_BASE_URL}
🔗 WebSocket URL: ${WS_BASE_URL}
🐛 Debug Mode: ${DEBUG}
🤖 AI Chat Enabled: ${ENABLE_AI_CHAT}
📡 Streaming Enabled: ${ENABLE_STREAMING}
  `);
};

// 导出所有配置
export default {
  isDevelopment,
  isProduction,
  API_BASE_URL,
  WS_BASE_URL,
  APP_NAME,
  VERSION,
  DEBUG,
  ENABLE_AI_CHAT,
  ENABLE_STREAMING,
  log,
  printEnvInfo,
};
