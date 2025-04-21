import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, message } from 'antd';
import apiClient from '../../common/http/apiClient';
import './style.less';
import wsClient from '../../common/websocket/wsClient';

const OAuthRegister = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    authUserId: location.state?.authUserId,
  });

  useEffect(() => {
    // 从 location.state 获取 email
    if (location.state?.email) {
      setFormData(prev => ({
        ...prev,
        email: location.state.email,
      }));
    }
  }, [location]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const response = await apiClient.post('oauth/register', formData);
      if (response.data.success) {
        localStorage.setItem('token', response.headers.token);
        localStorage.setItem('refreshToken', response.headers.refreshtoken);
        wsClient.connect();
        message.success('Registration successful');
        navigate('/');
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="oauth-register-container">
      <h2>Complete Registration</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" name="email" value={formData.email} disabled />
        </div>
        <Button type="primary" htmlType="submit" className="submit-button">
          Complete Registration
        </Button>
      </form>
    </div>
  );
};

export default OAuthRegister;
