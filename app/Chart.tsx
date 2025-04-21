import React, { useState, useEffect } from 'react';
import { useRouter } from "expo-router";
import { Text, View, Button } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const Dashboard = () => {
  const [sleepTime, setSleepTime] = useState('');
  const [drinkCount, setDrinkCount] = useState('');
  const [exerciseType, setExerciseType] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [isExercise达标, setIsExercise达标] = useState('');
  const [exerciseDays, setExerciseDays] = useState('');
  const router = useRouter();

  useEffect(() => {
    // 从AsyncStorage读取数据
    const loadData = async () => {
      setSleepTime(await AsyncStorage.getItem('sleepTime') || '');
      setDrinkCount(await AsyncStorage.getItem('dailyDrinkAmount') || '');
      setExerciseType(await AsyncStorage.getItem('exerciseType') || '');
      setCaloriesBurned(await AsyncStorage.getItem('caloriesBurned') || '');
      setIsExercise达标(await AsyncStorage.getItem('isExercise达标') || '');
      setExerciseDays(await AsyncStorage.getItem('exerciseDays') || '');
    };
    loadData();
  }, []);

  return (
    <View>
      <Text>健康<br></br>饮水: 今日已喝水{drinkCount}ml</Text>
      <Text>今日喝水次数 {drinkCount} 次</Text>
      <Text>睡眠<br></br>昨晚睡了 {sleepTime} 小时</Text>
      <Text>运动<br></br>类型: {exerciseType}</Text>
      <Text>今日已消耗 {caloriesBurned} 千卡</Text>
      <Text>今日运动 {isExercise达标}</Text>
      <Text>已坚持运动 {exerciseDays} 天</Text>
      <Button title="返回首页" onPress={() => router.back()} />
    </View>
  );
};

export default Dashboard;