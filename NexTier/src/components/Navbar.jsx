import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import api from '../api';
import {
    activityNotificationEvent,
    clearActivityNotifications,
    getActivityNotifications,
    markActivityNotificationsRead,
} from '../notifications';

const getPreferences = () => {
    try {
        return JSON.parse(localStorage.getItem('nextier:preferences') || '{}');
    } catch {
        return {};
    }
};

const applyTheme = (theme) => {
    const resolved = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
    document.documentElement.dataset.theme = resolved;
};

const isTheme = (value) => ['light', 'dark', 'system'].includes(value);

const cacheTheme = (theme) => {
    try {
        localStorage.setItem('nextier:preferences', JSON.stringify({ ...getPreferences(), theme }));
    } catch (error) {
        console.warn('Could not cache the saved theme locally:', error);
    }
};

const getAvatarUrl = (profilePicture) => {
    if (!profilePicture) return '';
    if (/^https?:\/\//i.test(profilePicture)) return profilePicture;
    return `http://localhost:5000${profilePicture.startsWith('/') ? '' : '/'}${profilePicture}`;
};

const initials = (name) => name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';

function Avatar({ user, className = '' }) {
    return (
        <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-bold text-blue-700 ${className}`}>
            {initials(user?.user_name)}
            {user?.profile_pic && (
                <img
                    key={user.profile_pic}
                    src={getAvatarUrl(user.profile_pic)}
                    alt=""
                    onError={event => { event.currentTarget.style.display = 'none'; }}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}
        </span>
    );
}

export default function Navbar({ logo, user, onUserUpdate, onLogout }) {
    const [activePanel, setActivePanel] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [name, setName] = useState(user?.user_name || '');
    const [email, setEmail] = useState(user?.email_id || '');
    const [theme, setTheme] = useState(isTheme(getPreferences().theme) ? getPreferences().theme : 'light');
    const [profileError, setProfileError] = useState('');
    const [profileMessage, setProfileMessage] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingTheme, setIsSavingTheme] = useState(false);
    const [isUploadingPicture, setIsUploadingPicture] = useState(false);
    const fileInput = useRef(null);

    const navLinkStyle = ({ isActive }) =>
        `rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
            isActive
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
        }`;

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        if (!user?.user_id) return undefined;
        let isCurrent = true;

        api.get('/user/preferences')
            .then(response => {
                if (!isCurrent || !isTheme(response.data.theme)) return;
                setTheme(response.data.theme);
                cacheTheme(response.data.theme);
            })
            .catch(error => {
                if (!isCurrent) return;
                console.error('Failed to load appearance preferences from the database:', error);
                setProfileError(error.response?.data?.error || 'Could not load your saved appearance preference.');
            });

        return () => { isCurrent = false; };
    }, [user?.user_id]);

    useEffect(() => {
        if (!user?.user_id) return undefined;
        const syncNotifications = () => setNotifications(getActivityNotifications(user.user_id));
        syncNotifications();
        window.addEventListener(activityNotificationEvent, syncNotifications);
        window.addEventListener('storage', syncNotifications);
        return () => {
            window.removeEventListener(activityNotificationEvent, syncNotifications);
            window.removeEventListener('storage', syncNotifications);
        };
    }, [user?.user_id]);

    const toggleNotifications = () => {
        if (activePanel === 'notifications') {
            setActivePanel('');
            return;
        }
        setNotifications(getActivityNotifications(user?.user_id));
        markActivityNotificationsRead(user?.user_id);
        setActivePanel('notifications');
    };

    const handleProfileSave = async (event) => {
        event.preventDefault();
        setIsSavingProfile(true);
        setProfileError('');
        setProfileMessage('');
        try {
            const response = await api.put('/user', { user_name: name, email_id: email });
            onUserUpdate(response.data);
            setProfileMessage('Profile updated.');
        } catch (error) {
            setProfileError(error.response?.data?.error || 'Could not update your profile.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleThemeChange = async (event) => {
        const nextTheme = event.target.value;
        if (!isTheme(nextTheme) || nextTheme === theme) return;

        const previousTheme = theme;
        setProfileError('');
        setProfileMessage('');
        setTheme(nextTheme);
        setIsSavingTheme(true);

        try {
            const response = await api.put('/user/preferences', { theme: nextTheme });
            setTheme(response.data.theme);
            cacheTheme(response.data.theme);
            console.info('[NexTier] Database change saved', {
                resource: 'user_preferences',
                operation: 'update',
                theme: response.data.theme,
            });
            setProfileMessage('Appearance saved.');
        } catch (error) {
            setTheme(previousTheme);
            setProfileError(error.response?.data?.error || 'Could not save your appearance preference.');
        } finally {
            setIsSavingTheme(false);
        }
    };

    const handlePictureChange = async (event) => {
        const picture = event.target.files?.[0];
        if (!picture) return;
        setProfileError('');
        setProfileMessage('');
        setIsUploadingPicture(true);
        const formData = new FormData();
        formData.append('profile_picture', picture);
        try {
            const response = await api.post('/user/profile-picture', formData);
            onUserUpdate({ ...user, profile_pic: response.data.profile_pic });
            setProfileMessage('Profile picture updated.');
        } catch (error) {
            setProfileError(error.response?.data?.error || 'Could not upload this image.');
        } finally {
            setIsUploadingPicture(false);
            event.target.value = '';
        }
    };

    const unreadCount = notifications.filter(item => !item.read).length;
    const navLinks = (
        <>
            <NavLink to="/" end onClick={() => setMobileMenuOpen(false)} className={navLinkStyle}>Dashboard</NavLink>
            <NavLink to="/workout" onClick={() => setMobileMenuOpen(false)} className={navLinkStyle}>Workout</NavLink>
            <NavLink to="/diet" onClick={() => setMobileMenuOpen(false)} className={navLinkStyle}>Diet</NavLink>
        </>
    );

    return (
        <nav className="fixed inset-x-0 top-0 z-50 px-2 py-2 sm:px-4 lg:px-8">
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 rounded-3xl border border-white/30 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-xl sm:flex-nowrap sm:gap-4 sm:px-5">
                <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label="NexTier home">
                    <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-10 sm:w-10" />
                    <span className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">NexTier</span>
                </Link>

                <div className="hidden items-center gap-1 md:flex">{navLinks}</div>

                <div className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 p-1 sm:gap-2">
                    <button
                        type="button"
                        onClick={toggleNotifications}
                        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                        aria-expanded={activePanel === 'notifications'}
                        className="relative flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-slate-900/15 sm:h-10 sm:w-10"
                    >
                        <span className="material-symbols-outlined">notifications</span>
                        {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-cyan-500 bg-red-500" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActivePanel(activePanel === 'settings' ? '' : 'settings')}
                        aria-label="Settings and profile"
                        aria-expanded={activePanel === 'settings'}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-slate-900/15 sm:h-10 sm:w-10"
                    >
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                    <div className="hidden h-8 border-l border-white/30 sm:block" />
                    <button
                        type="button"
                        onClick={() => setActivePanel(activePanel === 'settings' ? '' : 'settings')}
                        className="flex max-w-36 items-center gap-2 rounded-full px-1 text-left sm:max-w-52 sm:pl-2"
                    >
                        <span className="hidden truncate text-sm font-semibold text-white sm:block">{user?.user_name}</span>
                        <Avatar user={user} className="h-9 w-9 border-2 border-white/70 text-xs sm:h-10 sm:w-10" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(open => !open)}
                        aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-expanded={mobileMenuOpen}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-slate-900/15 md:hidden"
                    >
                        <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
                    </button>
                </div>

                {mobileMenuOpen && <div className="flex w-full flex-col gap-1 border-t border-slate-200 pt-2 md:hidden">{navLinks}</div>}
            </div>

            {activePanel === 'notifications' && (
                <section aria-label="Activity notifications" className="absolute right-2 top-[calc(100%+0.25rem)] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-4 lg:right-8">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div>
                            <h2 className="font-bold text-slate-900">Activity</h2>
                            <p className="text-xs text-slate-500">Recent diet and workout updates</p>
                        </div>
                        <button type="button" onClick={() => { clearActivityNotifications(user?.user_id); setNotifications([]); }} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                            Clear all
                        </button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto p-2">
                        {notifications.length === 0 ? (
                            <p className="px-3 py-8 text-center text-sm text-slate-500">No activity yet. Logging food, water, or a workout will show here.</p>
                        ) : notifications.map(item => (
                            <article key={item.id} className="rounded-xl px-3 py-3 hover:bg-slate-50">
                                <h3 className="text-sm font-bold text-slate-800">{item.title}</h3>
                                <p className="mt-0.5 text-sm text-slate-600">{item.message}</p>
                                <time className="mt-1 block text-xs text-slate-400" dateTime={item.createdAt}>
                                    {new Date(item.createdAt).toLocaleString()}
                                </time>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {activePanel === 'settings' && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5">
                    <section role="dialog" aria-modal="true" aria-labelledby="profile-settings-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 id="profile-settings-title" className="text-xl font-bold text-slate-900">Profile & settings</h2>
                                <p className="mt-1 text-sm text-slate-500">Manage your account and appearance.</p>
                            </div>
                            <button type="button" onClick={() => setActivePanel('')} aria-label="Close settings" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="mb-6 flex items-center gap-4">
                            <Avatar user={user} className="h-16 w-16 border border-slate-200 text-lg" />
                            <div>
                                <input
                                    ref={fileInput}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    onChange={handlePictureChange}
                                    className="sr-only"
                                    aria-label="Choose profile picture"
                                />
                                <button type="button" disabled={isUploadingPicture} onClick={() => fileInput.current?.click()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                                    {isUploadingPicture ? 'Uploading…' : 'Upload picture'}
                                </button>
                                <p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP, or GIF; up to 5 MB.</p>
                            </div>
                        </div>

                        <form onSubmit={handleProfileSave} className="space-y-4">
                            <label className="block text-sm font-semibold text-slate-700">
                                Display name
                                <input required maxLength={40} value={name} onChange={event => setName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                            </label>
                            <label className="block text-sm font-semibold text-slate-700">
                                Email
                                <input required type="email" maxLength={40} value={email} onChange={event => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                            </label>
                            <label className="block text-sm font-semibold text-slate-700">
                                Appearance
                                <select value={theme} onChange={handleThemeChange} disabled={isSavingTheme} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-400 disabled:opacity-60">
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                    <option value="system">Match device</option>
                                </select>
                            </label>
                            {profileError && <p role="alert" className="text-sm text-red-600">{profileError}</p>}
                            {profileMessage && <p role="status" className="text-sm text-emerald-700">{profileMessage}</p>}
                            <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
                                <button type="button" onClick={onLogout} className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 sm:text-center">
                                    Sign out
                                </button>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setActivePanel('')} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
                                    <button type="submit" disabled={isSavingProfile} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                                        {isSavingProfile ? 'Saving…' : 'Save profile'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </nav>
    );
}
