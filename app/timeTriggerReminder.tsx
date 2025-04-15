import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

// 配置通知权限（保持原样）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// 修正后的时间触发提醒组件
const TimeTriggerReminder = () => {
  useEffect(() => {
    const configureNotifications = async () => {
      // 请求通知权限
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('通知权限被拒绝');
        return;
      }

      // 删除旧通知
      await Notifications.cancelAllScheduledNotificationsAsync();

      // 创建新的重复通知（每小时一次）
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '饮水提醒',
          body: '该喝水啦！',
          sound: 'default',
        },
        trigger: {
          type: 'timeInterval',
          seconds: 60 * 60,
          repeats: true,
        } as Notifications.TimeIntervalTriggerInput, // 使用类型断言
      });
    };

    configureNotifications();
  }, []);

  return null;
};

export default TimeTriggerReminder;