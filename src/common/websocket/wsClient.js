import { io } from 'socket.io-client';

class WebSocketClient {
    constructor(url) {
        this.socket = null;
        this.url = url
    }

    connect() {
        const token = localStorage.getItem('token');
        console.log(token, this.socket, "token")

        if (!token || this.socket) {
            if (!token && !['/login', '/signup'].includes(window.location.pathname)) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
            return;
        }
        console.log('connect token', token, this.socket)

        this.socket = io(this.url, {
            auth: {
                token: token
            },
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
            // 避免同时建立多个连接
            multiplex: false,
            // 添加超时设置
            timeout: 5000
        });

        this.socket.on('connect', () => {
            console.log('Connected to socket server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from socket server');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            if (error.type === 'unauthorized') {
                localStorage.removeItem('token');
                window.location.href = '/login';
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