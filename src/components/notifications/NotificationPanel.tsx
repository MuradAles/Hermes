import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Notification } from '../../types/Notification';
import { useNotifications } from '../../hooks/useNotifications';
import './NotificationPanel.css';

interface NotificationPanelProps {
  userId: string;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ userId }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(userId);
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation(); // Prevent triggering the notification click
    await deleteNotification(notificationId);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 12,
        left: rect.left,
      });
    }
  }, [isOpen]);

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read).slice(0, 10); // Show last 10 read

  const dropdownContent = isOpen ? (
    <>
      <div className="notification-overlay" onClick={() => setIsOpen(false)} />
      <div 
        className="notification-dropdown"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
        }}
      >
            <div className="notification-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              )}
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="no-notifications">
                  <p>No notifications</p>
                </div>
              ) : (
                <>
                  {unreadNotifications.length > 0 && (
                    <>
                      <div className="notification-section-title">New</div>
                      {unreadNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`notification-item unread`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="notification-content">
                            <div className="notification-title">{notification.title}</div>
                            <div className="notification-message">{notification.message}</div>
                            <div className="notification-time">
                              {formatNotificationTime(notification.createdAt)}
                            </div>
                          </div>
                          <button
                            className="notification-delete-btn"
                            onClick={(e) => handleDeleteNotification(e, notification.id)}
                            aria-label="Delete notification"
                          >
                            ×
                          </button>
                          <div className="notification-unread-dot"></div>
                        </div>
                      ))}
                    </>
                  )}

                  {readNotifications.length > 0 && (
                    <>
                      {unreadNotifications.length > 0 && (
                        <div className="notification-section-title">Earlier</div>
                      )}
                      {readNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="notification-item read"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="notification-content">
                            <div className="notification-title">{notification.title}</div>
                            <div className="notification-message">{notification.message}</div>
                            <div className="notification-time">
                              {formatNotificationTime(notification.createdAt)}
                            </div>
                          </div>
                          <button
                            className="notification-delete-btn"
                            onClick={(e) => handleDeleteNotification(e, notification.id)}
                            aria-label="Delete notification"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
    </>
  ) : null;

  return (
    <div className="notification-panel">
      <button
        ref={buttonRef}
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && createPortal(dropdownContent, document.body)}
    </div>
  );
};

function formatNotificationTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

