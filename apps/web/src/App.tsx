import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import POSDashboard from './pages/POSDashboard'; 
import KitchenDisplay from './pages/KitchenDisplay';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/pos" element={<POSDashboard />} />
        <Route path="/kds" element={<KitchenDisplay />} />
      </Routes>
    </BrowserRouter>
  );
}