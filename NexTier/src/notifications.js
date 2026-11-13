const notificationKey = (userId) => `nextier:activity:${userId}`;
const notificationEvent = 'nextier:notifications';

export const getActivityNotifications = (userId) => {
    try {
        return JSON.parse(localStorage.getItem(notificationKey(userId)) || '[]');
    } catch {
        return [];
    }
};

export const recordActivityNotification = (userId, title, message) => {
    if (!userId) return;
    const notifications = getActivityNotifications(userId);
    notifications.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        message,
        createdAt: new Date().toISOString(),
        read: false,
    });
    localStorage.setItem(notificationKey(userId), JSON.stringify(notifications.slice(0, 30)));
    window.dispatchEvent(new CustomEvent(notificationEvent, { detail: userId }));
};

export const markActivityNotificationsRead = (userId) => {
    const notifications = getActivityNotifications(userId).map(item => ({ ...item, read: true }));
    localStorage.setItem(notificationKey(userId), JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent(notificationEvent, { detail: userId }));
};

export const clearActivityNotifications = (userId) => {
    localStorage.removeItem(notificationKey(userId));
    window.dispatchEvent(new CustomEvent(notificationEvent, { detail: userId }));
};

export const activityNotificationEvent = notificationEvent;
