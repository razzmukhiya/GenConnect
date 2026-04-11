import React, { useState } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { server } from '../../server.js';
import Navbar from '../Components/Navbar';
import '../Styles/Signup.css';
import { generateKeyPair } from '../utils/crypto.js';

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    number: '',
    dateOfBirth: '',
    gender: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${server}/signup`, formData);
      const token = response.data.token;
      const userId = response.data.userId;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ id: userId }));
      // Gen E2EE keys if not exist (client-side)
      if (!localStorage.getItem('localPrivateKey')) {
        const keys = await generateKeyPair();
        localStorage.setItem('localPrivateKey', keys.privateKey);
        await axios.put(`${server}/users/${userId}/keys`, { publicKey: keys.publicKey }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.info('E2EE keys generated client-side');
      }
      toast.success('Signup successful! Please log in.');
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        number: '',
        dateOfBirth: '',
        gender: '',
        password: ''
      });

    } catch (error) {
      if (error.response) {
        toast.error(error.response.data.message || 'Signup failed');
      } else {
        toast.error('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="signup-container">
        <div className="signup-form">
          <h1 className="signup-title">Create Account</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="number">Mobile Number</label>
              <input
                type="tel"
                id="number"
                name="number"
                value={formData.number}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
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
           
            <button type="submit" className="signup-btn" disabled={loading}>
              {loading ? 'Signing Up...' : 'Sign Up'}
            </button>
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

export default Signup;
