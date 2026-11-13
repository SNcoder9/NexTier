import { useState, useEffect } from 'react'
import './App.css'
import { Route, Routes } from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import Workout from './pages/Workout'
import Diet from './pages/Diet'
import Login from './pages/Login'
import Navbar from './components/Navbar'
import api from './api'
import logo from './assets/logo.png'

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(sessionStorage.getItem('nextier_token')));

  useEffect(() => {
    const token = sessionStorage.getItem('nextier_token');
    if (!token) return undefined;

    api.get('/user')
      .then(response => setUser(response.data))
      .catch(() => {
        sessionStorage.removeItem('nextier_token');
        setUser(null);
      })
      .finally(() => setIsLoading(false));

    const handleUnauthorized = () => {
      setUser(null);
      setIsLoading(false);
    };
    window.addEventListener('nextier:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('nextier:unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clear the local session even if the server is unreachable.
    }
    sessionStorage.removeItem('nextier_token');
    setUser(null);
  };

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center text-slate-600">Loading your account…</main>;
  }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <>
      <Navbar logo={logo} user={user} onUserUpdate={setUser} onLogout={handleLogout} />
      <main className="min-h-screen w-full">
        <div className="mx-auto w-full max-w-[1800px] px-2 py-2 sm:px-4 md:px-6">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/workout" element={<Workout user={user} />} />
            <Route path="/diet" element={<Diet user={user} />} />
          </Routes>
        </div>
      </main>
    </>
  );
}

export default App
