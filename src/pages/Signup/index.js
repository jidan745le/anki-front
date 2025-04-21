import React, { useState } from 'react';
import axios from 'axios';
import './style.less';
import { Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = 'Username is required';
    // if (!formData.email) {
    //     newErrors.email = 'Email is required';
    // } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    //     newErrors.email = 'Email is invalid';
    // }
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    return newErrors;
  };

  const handleSubmit = e => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      setErrors({});
      // Handle registration logic here
      console.log('Registration successful:', formData);
      setSubmitLoading(true);
      axios
        .post(`/api/user/register`, { username: formData.username, password: formData.password })
        .then(res => {
          const data = res.data;
          console.log(res.headers, 'header');
          setSubmitLoading(false);
          if (data.code === 200) {
            if (data.success) {
              setFormData({
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
              });
              //处理登录逻辑
              localStorage.setItem('token', res.headers.token);
              localStorage.setItem('refreshToken', res.headers.refreshtoken);
              navigate('/decks');
              return;
            }
            message.error(data.message);
          }
        })
        .catch(err => {
          setSubmitLoading(false);

          console.log(err);
        });
      // Reset form
    }
  };

  return (
    <div className="register-container">
      <h2>Sign Up</h2>
      <form>
        <div>
          <label>Username</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} />
          {errors.username && <span style={{ color: 'red' }}>{errors.username}</span>}
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
          />
          {errors.password && <span style={{ color: 'red' }}>{errors.password}</span>}
        </div>
        <div>
          <label>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
          {errors.confirmPassword && <span style={{ color: 'red' }}>{errors.confirmPassword}</span>}
        </div>
        <Button onClick={handleSubmit} loading={submitLoading} className="button">
          Register
        </Button>
      </form>
    </div>
  );
};

export default Register;
