import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Signup from './pages/Signup';
import Questions from './pages/Questions';
import ThankYou from './pages/ThankYou';
import AdminDashboard from './pages/AdminDashboard';


export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto container p-4">
        <Routes>
          <Route path="/" element={<Signup />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/thankyou" element={<ThankYou />} />
           <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </div>
  );
}
