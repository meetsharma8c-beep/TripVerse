export type NotificationType = 
  | 'countdown' 
  | 'weather_alert' 
  | 'packing' 
  | 'deal' 
  | 'disruption' 
  | 'system';

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface TripNotification {
  id: string;
  tripId?: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  priority: NotificationPriority;
  actionLabel?: string;
  actionTarget?: 'packing' | 'itinerary' | 'weather' | 'deals' | 'replanning' | 'explore' | 'home' | 'plan' | 'breakstops' | 'safety' | 'trips';
  icon?: string;
}

export interface TripCountdownInfo {
  tripId: string;
  tripName: string;
  destination: string;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  isToday: boolean;
  isPast: boolean;
}
