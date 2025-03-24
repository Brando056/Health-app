import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

// 配置通知权限
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// 时间触发提醒函数
const TimeTriggerReminder = () => {
  useEffect(() => {
    const scheduleNotification = async () => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '饮水提醒',
          body: '该喝水啦！',
        },
        trigger: {
          type: 'timeInterval', // 指定触发器类型
          seconds: 60 * 60, // 每小时提醒一次
        },
      });
    };

    scheduleNotification();
  }, []);

  return null;
};

export default TimeTriggerReminder;