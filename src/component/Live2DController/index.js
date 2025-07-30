import PropTypes from 'prop-types';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  calculateMouthForm,
  calculateMouthOpenFromVolume,
  createPIXIApp,
  LIVE2D_CONFIG,
  loadLive2DModel,
  setModelMouthParameters,
  waitForLive2DScripts,
} from '../../common/constants/live2d';

/**
 * Live2D 控制器组件
 *
 * 功能特性：
 * - 🎭 Live2D模型加载和显示
 * - 🎵 实时口型同步（基于音频分析）
 * - 😊 表情控制（支持多种表情切换）
 * - 📊 音量监测和调试信息
 * - 🔧 灵活的配置选项
 */

/**
 * Live2D Controller Component
 * @param {Object} props - 组件属性
 * @param {boolean} props.visible - 是否显示组件
 * @param {string} props.modelUrl - Live2D模型URL
 * @param {number} props.width - 画布宽度
 * @param {number} props.height - 画布高度
 * @param {number} props.scale - 模型缩放比例
 * @param {Object} props.position - 模型位置
 * @param {boolean} props.showDebugInfo - 是否显示调试信息
 * @param {Function} props.onModelLoaded - 模型加载完成回调
 * @param {Function} props.onError - 错误回调
 * @param {string} props.className - CSS类名
 * @param {Object} props.style - 内联样式
 * @param {Object} ref - React ref
 */
const Live2DController = forwardRef(
  (
    {
      visible = true,
      modelUrl = LIVE2D_CONFIG.DEFAULT_MODEL_URL,
      width = 600,
      height = 600,
      scale = LIVE2D_CONFIG.DEFAULT_SCALE,
      position = LIVE2D_CONFIG.DEFAULT_POSITION,
      onModelLoaded,
      onError,
      className = '',
      style = {},
    },
    ref
  ) => {
    // 组件状态
    const [isReady, setIsReady] = useState(false);
    const [isInited, setIsInited] = useState(false);
    const [currentExpression, setCurrentExpression] = useState('neutral');
    const [debugInfo, setDebugInfo] = useState({
      volume: 0,
      mouthOpen: 0,
      mouthForm: 0,
      syncStatus: '待机',
    });

    // 引用
    const canvasRef = useRef(null);
    const appRef = useRef(null);
    const modelRef = useRef(null);
    const isLoadingRef = useRef(false);

    // 动画控制
    const animationRef = useRef({
      id: null,
      isRunning: false,
    });

    // 音频分析相关
    const audioAnalysisRef = useRef({
      analyser: null,
      volumeData: new Uint8Array(LIVE2D_CONFIG.AUDIO_ANALYSIS.FFT_SIZE),
      isActive: false,
      volumeThreshold: LIVE2D_CONFIG.AUDIO_ANALYSIS.VOLUME_THRESHOLD,
      smoothingFactor: LIVE2D_CONFIG.AUDIO_ANALYSIS.SMOOTHING_FACTOR,
      currentMouthOpen: 0,
      currentMouthForm: 0,
    });

    // 暴露给父组件的API
    useImperativeHandle(
      ref,
      () => ({
        // 表情控制
        setExpression: expressionName => {
          if (expressionName) {
            console.log('🎭 设置表情:', expressionName);
            setExpressionInternal(expressionName);
          } else {
            console.warn(`不支持的表情: ${expressionName}`);
          }
        },

        // 获取支持的表情列表
        getSupportedExpressions: () => Object.keys(LIVE2D_CONFIG.EXPRESSIONS),

        // 口型控制（手动设置）
        setMouthParameters: (openY, form = 0) => {
          setMouthParametersInternal(openY, form);
        },

        // 连接音频分析器进行自动口型同步
        connectAudioAnalyser: analyser => {
          connectAudioAnalyserInternal(analyser);
        },

        // 断开音频分析器
        disconnectAudioAnalyser: () => {
          disconnectAudioAnalyserInternal();
        },

        // 获取模型状态
        getModelState: () => ({
          isReady,
          currentExpression,
          debugInfo,
        }),

        // 重新加载模型
        reloadModel: () => {
          if (!isLoadingRef.current) {
            loadLive2DModelInternal();
          }
        },
      }),
      [isReady, currentExpression, debugInfo]
    );

    // 初始化组件
    useEffect(() => {
      if (visible && canvasRef.current && !isLoadingRef.current) {
        initializeLive2D();
      }

      return () => {
        cleanup();
      };
    }, [visible, modelUrl]);

    // 初始化Live2D
    const initializeLive2D = async () => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      try {
        console.log('🎭 开始初始化Live2D控制器...');

        // 等待脚本加载
        await waitForLive2DScripts();
        console.log('✅ Live2D脚本加载完成');

        await loadLive2DModelInternal();
      } catch (error) {
        console.error('❌ Live2D初始化失败:', error);
        onError?.(error);
      } finally {
        isLoadingRef.current = false;
      }
    };

    // 加载Live2D模型
    const loadLive2DModelInternal = async () => {
      try {
        // 清理旧的应用
        if (appRef.current) {
          appRef.current.destroy(true);
          appRef.current = null;
        }

        // 使用帮助函数创建PIXI应用
        appRef.current = createPIXIApp(canvasRef.current, {
          width,
          height,
          backgroundAlpha: 0,
          backgroundColor: 0x000000,
          transparent: true,
          autoStart: true,
          antialias: true,
          preserveDrawingBuffer: true, // 可能需要这个
        });

        // 如果上面不行，尝试手动设置
        // if (appRef.current.renderer) {
        //   appRef.current.renderer.background.alpha = 0;
        // }

        console.log('✅ PIXI应用创建成功');

        // 使用帮助函数加载Live2D模型
        modelRef.current = await loadLive2DModel(modelUrl, {
          autoInteract: false,
        });

        console.log('✅ Live2D模型加载成功');

        // 停止自动动作和表情
        if (modelRef.current.internalModel.motionManager) {
          modelRef.current.internalModel.motionManager.stopAllMotions();
          // 禁用idle动作
          modelRef.current.internalModel.motionManager.groups.idle = null;
          modelRef.current.internalModel.motionManager.groups.Idle = null;
        }

        // 添加到舞台
        appRef.current.stage.addChild(modelRef.current);

        // 设置位置和缩放
        modelRef.current.scale.set(scale);
        modelRef.current.x = position.x;
        modelRef.current.y = position.y;

        setIsReady(true);
        setIsInited(true);
        console.log('🎉 Live2D控制器初始化完成');

        onModelLoaded?.(modelRef.current);
      } catch (error) {
        console.error('❌ Live2D模型加载失败:', error);
        throw error;
      }
    };

    useEffect(() => {
      if (isReady && isInited) {
        startVolumeMonitoring();
      }

      // 清理函数
      return () => {
        stopVolumeMonitoring();
      };
    }, [isReady, isInited]);

    // 设置表情
    const setExpressionInternal = expressionName => {
      if (!modelRef.current || !isReady) {
        console.warn('模型未准备好，无法设置表情');
        return false;
      }

      try {
        modelRef.current.expression(expressionName);
        setCurrentExpression(expressionName);
        console.log(`✅ 设置表情: ${expressionName}`);
        return true;
      } catch (error) {
        console.error(`❌ 设置表情失败: ${expressionName}`, error);
        return false;
      }
    };

    // 设置口型参数
    const setMouthParametersInternal = (openY, form = 0) => {
      if (!modelRef.current || !modelRef.current.internalModel || !isReady) {
        return false;
      }

      // 使用帮助函数设置口型参数
      const success = setModelMouthParameters(modelRef.current, openY, form);

      if (success) {
        // 更新调试信息
        setDebugInfo(prev => ({
          ...prev,
          mouthOpen: openY,
          mouthForm: form,
        }));
      }

      return success;
    };

    // 连接音频分析器
    const connectAudioAnalyserInternal = analyser => {
      if (!analyser) {
        console.warn('音频分析器无效');
        return false;
      }

      audioAnalysisRef.current.analyser = analyser;
      audioAnalysisRef.current.isActive = true;
      audioAnalysisRef.current.volumeData = new Uint8Array(analyser.frequencyBinCount);

      console.log('✅ 音频分析器已连接，开始口型同步');
      return true;
    };

    // 断开音频分析器
    const disconnectAudioAnalyserInternal = () => {
      audioAnalysisRef.current.analyser = null;
      audioAnalysisRef.current.isActive = false;
      audioAnalysisRef.current.currentMouthOpen = 0;
      audioAnalysisRef.current.currentMouthForm = 0;

      console.log('🔇 音频分析器已断开');
    };

    // 开始音量监测
    const startVolumeMonitoring = () => {
      // 如果已经在运行，先停止
      if (animationRef.current.isRunning) {
        stopVolumeMonitoring();
      }

      animationRef.current.isRunning = true;

      const updateVolume = () => {
        // 检查是否应该继续运行
        if (!animationRef.current.isRunning) {
          return;
        }

        const { analyser, volumeData, isActive, volumeThreshold, smoothingFactor } =
          audioAnalysisRef.current;

        if (analyser && isActive) {
          // 获取频域数据
          analyser.getByteFrequencyData(volumeData);

          // 计算平均音量
          let sum = 0;
          for (let i = 0; i < volumeData.length; i++) {
            sum += volumeData[i];
          }
          const avgVolume = sum / volumeData.length;

          // 更新调试信息
          setDebugInfo(prev => ({
            ...prev,
            volume: Math.round(avgVolume),
            syncStatus: avgVolume > volumeThreshold ? '正在同步' : '静音状态',
          }));

          // 使用帮助函数计算口型参数
          if (avgVolume > volumeThreshold) {
            const targetMouthOpen = calculateMouthOpenFromVolume(avgVolume);

            // 平滑处理
            audioAnalysisRef.current.currentMouthOpen =
              audioAnalysisRef.current.currentMouthOpen * smoothingFactor +
              targetMouthOpen * (1 - smoothingFactor);

            // 使用帮助函数计算嘴型形状变化
            audioAnalysisRef.current.currentMouthForm = calculateMouthForm();
          } else {
            // 音量太小，逐渐闭嘴
            audioAnalysisRef.current.currentMouthOpen *= 0.9;
            audioAnalysisRef.current.currentMouthForm *= 0.9;
          }

          // 应用到Live2D模型
          setMouthParametersInternal(
            audioAnalysisRef.current.currentMouthOpen,
            audioAnalysisRef.current.currentMouthForm
          );
        } else {
          // 没有音频时重置
          audioAnalysisRef.current.currentMouthOpen *= 0.95;
          audioAnalysisRef.current.currentMouthForm *= 0.95;
          setMouthParametersInternal(
            audioAnalysisRef.current.currentMouthOpen,
            audioAnalysisRef.current.currentMouthForm
          );

          setDebugInfo(prev => ({
            ...prev,
            syncStatus: '待机',
          }));
        }

        // 继续下一帧
        animationRef.current.id = requestAnimationFrame(updateVolume);
      };

      // 开始动画循环
      animationRef.current.id = requestAnimationFrame(updateVolume);
    };

    // 停止音量监测
    const stopVolumeMonitoring = () => {
      animationRef.current.isRunning = false;

      if (animationRef.current.id) {
        cancelAnimationFrame(animationRef.current.id);
        animationRef.current.id = null;
      }
    };

    // 清理资源
    const cleanup = () => {
      // 停止动画循环
      stopVolumeMonitoring();

      // 断开音频分析器
      disconnectAudioAnalyserInternal();

      modelRef.current.internalModel?.destroy();

      // 清理PIXI应用
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }

      // 重置状态
      modelRef.current = null;
      setIsReady(false);
      setIsInited(false);
      isLoadingRef.current = false;
    };

    if (!visible) return null;

    return (
      <div
        className={`live2d-controller ${className}`}
        style={{
          position: 'relative',
          display: 'inline-block',
          // border: '2px solid #e1e5e9',
          borderRadius: '15px',
          background: 'transparent',
          overflow: 'hidden',
          ...style,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            background: 'transparent',
          }}
        />
        {/* {!isReady && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(255,255,255,0.9)',
              padding: '20px',
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <div>🎭 正在加载Live2D模型...</div>
          </div>
        )} */}
      </div>
    );
  }
);

Live2DController.propTypes = {
  visible: PropTypes.bool,
  modelUrl: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  scale: PropTypes.number,
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  showDebugInfo: PropTypes.bool,
  onModelLoaded: PropTypes.func,
  onError: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

Live2DController.displayName = 'Live2DController';

export default Live2DController;
