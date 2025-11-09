import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import type { Notification } from '../types/Notification';

export const notificationService = {
  /**
   * Subscribe to user's notifications
   * Uses auth.currentUser.uid to ensure Firestore rules can verify the query
   */
  subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): () => void {
    // Use auth.currentUser.uid to ensure Firestore rules can verify the query
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('No authenticated user for notifications');
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }

    // Verify userId matches authenticated user (security check)
    if (userId !== currentUser.uid) {
      console.warn('Notification userId does not match authenticated user');
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      console.log(`[Notifications] Received ${snapshot.docs.length} notifications for user ${currentUser.uid}`);
      const notifications = snapshot.docs.map((doc) => {
        const data = doc.data();
        console.log(`[Notifications] Notification ${doc.id}:`, {
          userId: data.userId,
          title: data.title,
          read: data.read,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        });
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(data.createdAt) || new Date(),
          readAt: data.readAt?.toDate() || (data.readAt ? new Date(data.readAt) : undefined),
        };
      }) as Notification[];
      callback(notifications);
    }, (error) => {
      console.error('[Notifications] Error subscribing to notifications:', error);
      callback([]);
    });
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      readAt: Timestamp.now(),
    });
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser || userId !== currentUser.uid) {
      throw new Error('Unauthorized: Cannot mark notifications as read');
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map((doc) =>
      updateDoc(doc.ref, {
        read: true,
        readAt: Timestamp.now(),
      })
    );
    
    await Promise.all(updates);
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await deleteDoc(doc(db, 'notifications', notificationId));
  },
};

