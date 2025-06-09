import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure notification handler (keep as is)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,  
    shouldShowList: true,
  }),
});

// Fixed time-triggered reminder component
const TimeTriggerReminder = () => {
  useEffect(() => {
    const configureNotifications = async () => {
      // Request notification permission
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Notification permission denied');
        return;
      }

      // Cancel all previously scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Schedule a new repeating notification (every hour)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Drink Water Reminder',
          body: "It's time to drink water!",
          sound: 'default',
        },
        trigger: {
          type: 'timeInterval',
          seconds: 60 * 60,
          repeats: true,
        } as Notifications.TimeIntervalTriggerInput, // Use type assertion
      });
    };

    configureNotifications();
  }, []);

  return null;
};

export default TimeTriggerReminder;
