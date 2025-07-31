const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin'); // Import the plugin
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { SourceMap } = require('module');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const isDevelopment = process.env.NODE_ENV !== 'production';
const optimaizationConfig = {
    optimization: {
        splitChunks: {
            chunks: 'all',
            maxInitialRequests: Infinity,
            minSize: 20000,
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name(module, chunks, cacheGroupKey) {
                        // 安全的获取包名
                        const getPackageName = module => {
                            if (!module.context) return 'vendors';

                            const match = module.context.match(
                                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                            );

                            if (!match) return 'vendors';

                            const packageName = match[1];
                            return packageName
                                .replace('@', '')
                                .replace(/[\\/|]/g, '-');
                        };

                        const packageName = getPackageName(module);

                        // 如果是node_modules直接引入的文件
                        if (packageName === 'vendors') {
                            return 'vendors';
                        }

                        // 正常的npm包
                        return `npm.${packageName}`;
                    },
                    priority: -10,
                    chunks: 'all',
                    enforce: true
                },
                // 特定库的分割
                react: {
                    test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                    name: 'react',
                    chunks: 'all',
                    priority: 20
                },
                // antd单独打包
                antd: {
                    test: /[\\/]node_modules[\\/]antd[\\/]/,
                    name: 'antd',
                    chunks: 'all',
                    priority: 15
                },
                // 公共模块
                commons: {
                    name: 'commons',
                    minChunks: 2, // 最少被引用2次
                    priority: -20
                }
            }
        },
        // 5. Tree Shaking 相关
        usedExports: true,
        sideEffects: true,

        // 6. 模块连接
        concatenateModules: true,
        // 添加 minimizer 配置
        minimizer: [
            new TerserPlugin({
                parallel: true, // 启用多进程并行运行
                terserOptions: {
                    parse: {
                        // 我们想要尽可能解析 ECMAScript 规范
                        ecma: 2017,
                    },
                    compress: {
                        ecma: 5, // 指定压缩时的 ECMAScript 版本
                        comparisons: false,
                        inline: 2,
                        // drop_console: process.env.NODE_ENV === 'production', // 生产环境下移除 console
                        // drop_debugger: true, // 移除 debugger
                        // pure_funcs: process.env.NODE_ENV === 'production'
                        //     ? ['console.log', 'console.info', 'console.debug']
                        //     : [], // 移除指定函数
                        pure_getters: true, // 优化 getter
                        unsafe_math: true, // 优化数学表达式
                        unsafe_methods: true, // 优化方法调用
                        unsafe_proto: true, // 优化原型属性访问
                        passes: 3, // 优化次数
                    },
                    mangle: {
                        safari10: true, // 修复 Safari 10 循环迭代器 bug
                    },
                    output: {
                        ecma: 5,
                        comments: false, // 移除注释
                        ascii_only: true, // 将 Unicode 字符转换为 ASCII
                    },
                },
                extractComments: false, // 不将注释提取到单独的文件中
            }),
        ]
    }
}

module.exports = {
    entry: './src/index.js', // 入口文件
    output: {
        path: path.resolve(__dirname, 'dist'), // 输出目录
        filename: '[name].[contenthash].js',  // 之前是 'bundle.js'
        chunkFilename: '[name].[contenthash].js', // 非入口 chunk 的名称

        libraryTarget: "umd", // UMD library target
        publicPath: '/', // 静态资源路径        
    },
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    // Source maps
    //eval-cheap-module-source-map vscode可以定位到源码，浏览器不行
    //cheap-module-source-map 浏览器，vscode都可以定位到源码
    devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        hot: true, // 启用热模块替换
        compress: true, // 启用 gzip 压缩
        port: 3007, // 开发服务器端口
        open: true, // 自动打开浏览器
        historyApiFallback: true, // 支持 HTML5 History API
        client: {
            progress: true, // 在浏览器中显示编译进度
            overlay: { // 在浏览器中显示编译错误
                errors: true,
            },
        },
        // 代理配置（如果需要的话）

        proxy: [
            {
                context: ['/api'],
                target: 'http://localhost:3000',
                // target: 'https://www.myanki.cc',
                pathRewrite: (path) => {
                    return path.replace('/api', '')
                },

                changeOrigin: true,
                secure: false,  // 禁用 SSL 证书验证
                // configure: (proxy, options) => {
                //     proxy.on('proxyReq', (proxyReq, req, res) => {
                //         console.log('原始请求:', req.url)
                //         console.log('代理到:', proxyReq.path)
                //     })
                // }
            },
            {
                context: ['/socket.io/'],
                target: 'http://localhost:3000',
                // target: 'https://ws.myanki.cc',
                secure: false,  // 禁用 SSL 证书验证
                changeOrigin: true,
                ws: true
            },
            {
                context: ['/chat'],
                // target: 'http://8.222.155.238:3001',
                target: 'https://www.myanki.cc',
                // changeOrigin: true,
                // // 关键配置项
                // timeout: 0,  // 禁用超时
                // proxyTimeout: 0,  // 禁用代理超时
                // // 启用 WebSocket 支持
                // ws: true,
                // headers: {
                //     'Connection': 'keep-alive',
                //     'Accept': 'text/event-stream'
                // },
                // onProxyReq: (proxyReq, req, res) => {
                //     // 设置请求头
                //     proxyReq.setHeader('Connection', 'keep-alive');
                //     proxyReq.setHeader('Cache-Control', 'no-cache');
                //     proxyReq.setHeader('Accept', 'text/event-stream');
                // },
                // onProxyRes: (proxyRes, req, res) => {
                //     // 确保响应头正确设置
                //     proxyRes.headers['Cache-Control'] = 'no-cache';
                //     proxyRes.headers['Content-Type'] = 'text/event-stream';
                //     proxyRes.headers['Connection'] = 'keep-alive';

                //     // 删除可能导致问题的头
                //     delete proxyRes.headers['content-length'];
                //     delete proxyRes.headers['transfer-encoding'];

                //     console.log('代理响应头:', proxyRes.headers);
                // }
            },

        ],

    },
    module: {
        rules: [
            isDevelopment && {
                test: /node_modules/,
                loader: 'source-map-loader',

            },

            {
                test: /\.jsx?$/,
                include: [path.resolve(__dirname, './src')],
                loader: 'babel-loader',
                // options:{sourceMaps:false}
                // exclude: /node_modules\/(?!lodash|your-other-library)/
                // exclude: /node_modules/,
            },
            {
                test: /\.module\.css$/,
                use: [
                    isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: {
                            modules: {
                                namedExport: false, /* 模块化 */
                                mode: "local", /* 模块化 */
                                localIdentName: "[path][name]__[local]--[hash:base64:5]", /* 命名规则  [path][name]__[local] 开发环境 - 便于调试   */

                            }
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                exclude: /\.module\.css$/,
                use: [isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader, "css-loader"]
            }, ,
            {
                test: /\.less$/,
                use: [
                    isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true
                        }
                    },
                    {
                        loader: 'less-loader',
                        options: {
                            sourceMap: true,
                            lessOptions: {
                                javascriptEnabled: true,
                                math: 'always'
                            }
                        }
                    }
                ]
            },
            // 处理图片等静态资源
            {
                test: /\.(png|jpe?g|gif|svg|ico)$/i,
                type: 'asset',
                parser: {
                    dataUrlCondition: {
                        maxSize: 8 * 1024 // 8KB以下的图片转为base64
                    }
                },
                generator: {
                    filename: 'assets/images/[name].[hash:8][ext]'
                }
            },
            // 处理字体文件
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/fonts/[name].[hash:8][ext]'
                }
            }
        ].filter(Boolean),
    },
    plugins: [
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: ['**/*', '!static-files*', '!directoryToExclude/**']
        }), // Clean the dist folder
        new HtmlWebpackPlugin({ // Use the plugin
            template: './src/index.html', // Your HTML template file
            filename: './index.html', // Output HTML file name
            favicon: './src/favicon.ico'  // 添加这一行
        }),
        // 环境变量注入
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
            'process.env.API_BASE_URL': JSON.stringify(
                isDevelopment ? 'http://localhost:3007/api' : 'https://api.myanki.cc'
            ),
            'process.env.WS_BASE_URL': JSON.stringify(
                isDevelopment ? 'ws://localhost:3007' : 'wss://ws.myanki.cc'
            ),
            'process.env.APP_NAME': JSON.stringify('MyWar'),
            'process.env.VERSION': JSON.stringify('1.0.0'),
            'process.env.DEBUG': JSON.stringify(isDevelopment),
            'process.env.ENABLE_AI_CHAT': JSON.stringify(true),
            'process.env.ENABLE_STREAMING': JSON.stringify(true),
            
            // Live2D 全局常量注入
            '__PIXI__': 'window.PIXI',
            '__LIVE2D_CUBISM_CORE__': 'window.Live2DCubismCore',
            '__LIVE2D_MODEL__': 'window.PIXI?.live2d?.Live2DModel',
            '__LIVE2D_AVAILABLE__': 'typeof window !== "undefined" && window.PIXI && window.PIXI.live2d && window.Live2DCubismCore'
        }),
        process.env.ANALYZE && new BundleAnalyzerPlugin(),
        !isDevelopment && new MiniCssExtractPlugin({
            filename: 'css/[name].[contenthash:8].css',
            chunkFilename: 'css/[name].[contenthash:8].chunk.css',
        }),
        !isDevelopment && new CompressionPlugin({
            test: /\.(js|css|html|svg)$/,
            algorithm: 'gzip',
        }),
    ].filter(Boolean),
    ...(isDevelopment ? {
    } : optimaizationConfig),
    stats: {
        warningsFilter: [/Failed to parse source map/]
    },
    resolve: {
        alias: {
            src: path.resolve(__dirname, 'src')
        }
    }
};
