import React, { useState } from 'react';
import './style.less';
import apiClient from '../../common/http/apiClient';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate()

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle login logic here
        console.log('userName:', userName);
        console.log('Password:', password);
        apiClient.post(`/app/user/login`, { username: userName, password: password }).then(res => {
            const data = res.data
            if (data.code === 200) {
                if (data.success) {
                    //处理登录逻辑
                    console.log('Login successful:', data);
                    localStorage.setItem('token', res.headers.token);
                    message.success('Login successful')
                    navigate("/")
                } else {
                    console.log('Login failed:', data);
                    message.error(data.message)
                }
            }
        }).catch(err => {
            message.error(err.message)
        })
    };

    return (
        <div className="login-container">
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="userName">Username:</label>
                    <input
                        type="userName"
                        id="userName"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default Login;