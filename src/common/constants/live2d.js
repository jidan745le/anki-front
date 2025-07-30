/**
 * Live2D 全局常量管理
 * 通过webpack DefinePlugin注入的全局变量
 */

// Live2D 可用性检查
export const isLive2DAvailable = () => {
  try {
    return __LIVE2D_AVAILABLE__;
  } catch (error) {
    console.warn('Live2D 可用性检查失败:', error);
    return false;
  }
};

// 获取PIXI实例
export const getPIXI = () => {
  try {
    return __PIXI__;
  } catch (error) {
    console.error('无法获取PIXI实例:', error);
    return null;
  }
};

// 获取Live2D Cubism Core
export const getLive2DCubismCore = () => {
  try {
    return __LIVE2D_CUBISM_CORE__;
  } catch (error) {
    console.error('无法获取Live2D Cubism Core:', error);
    return null;
  }
};

// 获取Live2D Model构造函数
export const getLive2DModel = () => {
  try {
    return __LIVE2D_MODEL__;
  } catch (error) {
    console.error('无法获取Live2D Model:', error);
    return null;
  }
};

// Live2D 默认配置
export const LIVE2D_CONFIG = {
  DEFAULT_MODEL_URL:
    'https://myanki.oss-ap-southeast-1.aliyuncs.com/character/ryosan_chan/ryosan_chan.model3.json',
  DEFAULT_SCALE: 0.05,
  DEFAULT_POSITION: { x: 0, y: 0 },
  AUDIO_ANALYSIS: {
    FFT_SIZE: 256,
    SMOOTHING_TIME_CONSTANT: 0.8,
    VOLUME_THRESHOLD: 10,
    SMOOTHING_FACTOR: 0.8,
  },
  MOUTH_PARAMETERS: {
    MIN_OPEN: 0.15,
    MAX_OPEN: 1.2,
    BASE_OPEN: 0.2,
    VARIATION_RANGE: 0.08,
    FORM_AMPLITUDE: 0.2,
    FORM_FREQUENCY: 0.01,
  },
  EXPRESSIONS: {
    neutral: 'neutral',
    happy: 'happy',
    angry: 'angry',
    sad: 'sad',
    surprised: 'surprised',
    shy: 'embarrassed',
    sick: 'sick',
    panic: 'panic',
    upset: 'upset',
    pale: 'pale',
    sparkle: 'sparkle',
    hideear: 'hideear',
  },
  EXPRESSION_MAP: {
    温柔: 'neutral',
    开心: 'happy',
    生气: 'angry',
    害羞: 'embarrassed',
    惊讶: 'surprised',
    担心: 'sad',
    得意: 'sparkle',
    思考: 'neutral',
    冷淡: 'pale',
  },
};

// Live2D 初始化帮助函数
export const waitForLive2DScripts = () => {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      if (isLive2DAvailable()) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);

    // 设置超时，避免无限等待
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Live2D脚本加载超时'));
    }, 30000); // 30秒超时
  });
};

// 创建PIXI应用的帮助函数
export const createPIXIApp = (canvas, options = {}) => {
  const PIXI = getPIXI();
  if (!PIXI) {
    throw new Error('PIXI 未加载或不可用');
  }

  const defaultOptions = {
    view: canvas,
    width: 500,
    height: 400,
    backgroundColor: 0xf0f0f0,
    autoStart: true,
    antialias: true,
  };

  return new PIXI.Application({ ...defaultOptions, ...options });
};

// 加载Live2D模型的帮助函数
export const loadLive2DModel = async (modelUrl, options = {}) => {
  const Live2DModel = getLive2DModel();
  if (!Live2DModel) {
    throw new Error('Live2D Model 构造函数未加载或不可用');
  }

  const defaultOptions = {
    autoInteract: false,
  };

  return await Live2DModel.from(modelUrl, { ...defaultOptions, ...options });
};

// 设置Live2D模型参数的帮助函数
export const setModelMouthParameters = (model, openY, form = 0) => {
  if (!model || !model.internalModel) {
    return false;
  }

  try {
    const coreModel = model.internalModel.coreModel;

    if (coreModel.setParameterValueById) {
      // Cubism 4
      coreModel.setParameterValueById('ParamMouthOpenY', openY);
      coreModel.setParameterValueById('ParamMouthForm', form);
    } else if (coreModel.setParamFloat) {
      // Cubism 2
      coreModel.setParamFloat('PARAM_MOUTH_OPEN_Y', openY);
      coreModel.setParamFloat('PARAM_MOUTH_FORM', form);
    }

    return true;
  } catch (error) {
    console.warn('设置口型参数失败:', error);
    return false;
  }
};

// 计算音量映射到口型开合度
export const calculateMouthOpenFromVolume = volume => {
  const { VOLUME_THRESHOLD, MOUTH_PARAMETERS } = LIVE2D_CONFIG;

  if (volume <= VOLUME_THRESHOLD) {
    return 0;
  }

  // 音量映射到口型开合度
  const targetMouthOpen = Math.min(
    MOUTH_PARAMETERS.MAX_OPEN,
    MOUTH_PARAMETERS.BASE_OPEN + (volume / 115) * 1.0
  );

  // 添加自然变化
  const variation = (Math.random() - 0.5) * MOUTH_PARAMETERS.VARIATION_RANGE;

  return Math.max(
    MOUTH_PARAMETERS.MIN_OPEN,
    Math.min(MOUTH_PARAMETERS.MAX_OPEN, targetMouthOpen + variation)
  );
};

// 计算嘴型形状变化
export const calculateMouthForm = () => {
  const { MOUTH_PARAMETERS } = LIVE2D_CONFIG;
  return Math.sin(Date.now() * MOUTH_PARAMETERS.FORM_FREQUENCY) * MOUTH_PARAMETERS.FORM_AMPLITUDE;
};
