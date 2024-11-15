const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin'); // Import the plugin
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { SourceMap } = require('module');

module.exports = {
    entry: './src/index.js', // 入口文件
    output: {
        path: path.resolve(__dirname, 'dist'), // 输出目录
        filename: 'bundle.js', // 输出文件名        
        libraryTarget: "umd", // UMD library target
        publicPath: '/', // 静态资源路径
    },
    mode: 'development', // 设置模式为开发模式
    // Source maps
    //eval-cheap-module-source-map vscode可以定位到源码，浏览器不行
    //cheap-module-source-map 浏览器，vscode都可以定位到源码
    devtool: 'source-map',
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        hot: true, // 启用热模块替换
        compress: true, // 启用 gzip 压缩
        port: 3006, // 开发服务器端口
        open: true, // 自动打开浏览器
        historyApiFallback: true, // 支持 HTML5 History API
        client: {
            progress: true, // 在浏览器中显示编译进度
            overlay: { // 在浏览器中显示编译错误
                errors: true,
                warnings: false,
            },
        },
        // 代理配置（如果需要的话）

        proxy: [
            {   context: ['/app'],
                target: 'http://localhost:3000',
                pathRewrite: (path) => {
                    return path.replace('/app', '')
                },
           
                changeOrigin: true,
                configure: (proxy, options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        console.log('原始请求:', req.url)
                        console.log('代理到:', proxyReq.path)
                    })
                }
            },{
                context: ['/chat1'],
                target: 'http://8.222.155.238:3001',
                changeOrigin: true,
                // 关键配置项
                timeout: 0,  // 禁用超时
                proxyTimeout: 0,  // 禁用代理超时
                // 启用 WebSocket 支持
                ws: true,
                headers: {
                    'Connection': 'keep-alive',
                    'Accept': 'text/event-stream'
                },
                onProxyReq: (proxyReq, req, res) => {
                    // 设置请求头
                    proxyReq.setHeader('Connection', 'keep-alive');
                    proxyReq.setHeader('Cache-Control', 'no-cache');
                    proxyReq.setHeader('Accept', 'text/event-stream');
                },
                onProxyRes: (proxyRes, req, res) => {
                    // 确保响应头正确设置
                    proxyRes.headers['Cache-Control'] = 'no-cache';
                    proxyRes.headers['Content-Type'] = 'text/event-stream';
                    proxyRes.headers['Connection'] = 'keep-alive';
                    
                    // 删除可能导致问题的头
                    delete proxyRes.headers['content-length'];
                    delete proxyRes.headers['transfer-encoding'];
                    
                    console.log('代理响应头:', proxyRes.headers);
                }
            },

        ],

    },
    module: {
        rules: [
            {
                test: /node_modules/,
                loader: 'source-map-loader'
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
                    "style-loader",
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
                use: ["style-loader", "css-loader"]
            },,
            {
                test: /\.less$/,
                use: [
                    'style-loader',
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
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: ['**/*', '!static-files*', '!directoryToExclude/**']
        }), // Clean the dist folder
        new HtmlWebpackPlugin({ // Use the plugin
            template: './src/index.html', // Your HTML template file
            filename: './index.html', // Output HTML file name
        }),
    ],
};
