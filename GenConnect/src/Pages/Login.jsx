import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { server } from '../../server.js';
import Navbar from '../Components/Navbar';
import '../Styles/Login.css';
import { generateKeyPair } from '../utils/crypto.js';

const Login = () => {
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${server}/login`, formData);
      console.log('Login response:', response.data);
      toast.success('Login successful!');
localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Store private key from server response (server-side key generation for legacy users)
      if (response.data.privateKey) {
        console.log('Storing server-generated private key');
        localStorage.setItem('localPrivateKey', response.data.privateKey);
        toast.info('E2EE keys generated and stored');
      } else if (!localStorage.getItem('localPrivateKey')) {
        // Fallback: try client-side key generation
        console.log('Trying client-side key generation...');
        try {
          const keys = await generateKeyPair();
          console.log('Keys generated, publicKey length:', keys.publicKey.length);
          localStorage.setItem('localPrivateKey', keys.privateKey);
          
          // Try to set the public key on the server
          console.log('Setting public key for user:', response.data.user.id);
          const keyResponse = await axios.put(`${server}/users/${response.data.user.id}/keys`, { publicKey: keys.publicKey }, {
            headers: { Authorization: `Bearer ${response.data.token}` }
          });
          console.log('Public key set response:', keyResponse.data);
          toast.info('E2EE keys generated and stored');
        } catch (keyError) {
          console.error('Failed to set public key:', keyError);
          if (keyError.response) {
            console.error('Error response:', keyError.response.data);
          }
          toast.warning('Login successful but key storage failed');
        }
      }
      window.location.href = '/';

    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        toast.error(error.response.data.message || 'Login failed');
      } else {
        toast.error('Network error. Please try again.');
      }
    }
  };

  return (
    <>
      <Navbar />
      <div className="login-container">
        <div className="login-form">
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to your account to continue</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="emailOrPhone">Email or Phone Number</label>
              <input
                type="text"
                id="emailOrPhone"
                name="emailOrPhone"
                value={formData.emailOrPhone}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="login-btn">Login</button>
          </form>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default Login;
