export type NotificationType = 'weather_alert' | 'manual_notification' | 'flight_update';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  flightId?: string;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
}

