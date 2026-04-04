import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './Pages/Homepage';
import Friends from './Pages/Friends';
import Messages from './Pages/Messages';
import Signup from './Pages/Signup';
import Login from './Pages/Login';
import AdminLogin from './Pages/Admin/AdminLogin';
import AdminDashboard from './Pages/Admin/AdminDashboard';
import Admins from './Pages/Admin/Admins';
import Reports from './Pages/Admin/Reports';
import Users from './Pages/Users/Users';
import UserProfile from './Components/Users/UserProfile';
import Notifications from './Pages/Notifications';

// Placeholder components for admin routes
const PlaceholderComponent = ({ title }) => (
  <div style={{ padding: '2rem', textAlign: 'center', marginTop: '100px' }}>
    <h1>{title}</h1>
    <p>This page is under construction.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/admins" element={<Admins />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/reports" element={<Reports />} />
        <Route path="/admin/supports" element={<PlaceholderComponent title="Supports" />} />
        <Route path="/admin/profile" element={<PlaceholderComponent title="Admin Profile" />} />
        <Route path="/admin/settings" element={<PlaceholderComponent title="Admin Settings" />} />
        <Route path="/profile/:id" element={<UserProfile />} />
        <Route path="/notifications" element={<Notifications />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

