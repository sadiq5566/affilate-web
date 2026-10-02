import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { auth, admin } from './api.js';
import Layout from './components/Layout.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Products from './pages/Products.jsx';
import Coupons from './pages/Coupons.jsx';
import Stores from './pages/Stores.jsx';
import Categories from './pages/Categories.jsx';
import Conversions from './pages/Conversions.jsx';
import Clicks from './pages/Clicks.jsx';
import Subscribers from './pages/Subscribers.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(auth.token));

  useEffect(() => {
    if (auth.token) {
      admin('/me')
        .then(setUser)
        .catch(() => auth.clear())
        .finally(() => setChecking(false));
    }
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  if (checking) return <div className="boot">Loading…</div>;

  return (
    <ToastProvider>
      {!user ? (
        <Login onLogin={setUser} />
      ) : (
        <Layout
          user={user}
          onLogout={() => {
            auth.clear();
            setUser(null);
          }}
        >
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/products" element={<Products />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/conversions" element={<Conversions />} />
            <Route path="/clicks" element={<Clicks />} />
            <Route path="/subscribers" element={<Subscribers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </ToastProvider>
  );
}
