import { useState } from 'react';
import logo from '../assets/logo.png';
import api from '../api';

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { email, password });
            sessionStorage.setItem('nextier_token', response.data.token);
            onLogin(response.data.user);
            console.log({email, password})
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not sign in. Check that the server is available.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
            <section className="w-full max-w-md rounded-3xl border border-white/30 bg-white/90 p-6 shadow-2xl backdrop-blur-xl sm:p-9">
                <div className="mb-8 flex items-center gap-3">
                    <img src={logo} alt="" className="h-12 w-12 rounded-full object-cover" />
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">NexTier</h1>
                        <p className="text-sm text-slate-500">Your fitness dashboard</p>
                    </div>
                </div>

                <h2 className="text-xl font-bold text-slate-900">Welcome back</h2>
                <p className="mt-1 text-sm text-slate-500">Sign in with an existing NexTier account.</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <label className="block text-sm font-semibold text-slate-700">
                        Email
                        <input
                            type="email"
                            autoComplete="username"
                            required
                            maxLength={40}
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                        Password
                        <input
                            type="password"
                            autoComplete="current-password"
                            required
                            maxLength={128}
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                    </label>
                    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-bold text-white shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
            </section>
        </main>
    );
}
