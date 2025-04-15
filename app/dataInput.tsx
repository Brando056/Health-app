import React, { useState, useEffect } from 'react';
import { Text, TextInput, Button, View } from 'react-native';
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

const DataInput = () => {
  const [sleepTime, setSleepTime] = useState('');
  const [drinkCount, setDrinkCount] = useState('');
  const [exerciseType, setExerciseType] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [isExercise达标, setIsExercise达标] = useState('');
  const [exerciseDays, setExerciseDays] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    // 存储数据到AsyncStorage
    await AsyncStorage.setItem('sleepTime', sleepTime);
    await AsyncStorage.setItem('drinkCount', drinkCount);
    await AsyncStorage.setItem('exerciseType', exerciseType);
    await AsyncStorage.setItem('caloriesBurned', caloriesBurned);
    await AsyncStorage.setItem('isExercise达标', isExercise达标);
    await AsyncStorage.setItem('exerciseDays', exerciseDays);
    router.back(); // 提交后返回
  };

  return (
    <View>
      <Text>健康 - 饮水: 已有 <TextInput
        value={drinkCount}
        onChangeText={(text) => setDrinkCount(text)}
        placeholder="请输入喝水次数"
      /> 次喝水</Text>
      <Text>今日喝水次数 <TextInput
        value={drinkCount}
        onChangeText={(text) => setDrinkCount(text)}
        placeholder="请输入次数"
      /> 次</Text>
      <Text>睡眠 - 昨晚睡了 <TextInput
        value={sleepTime}
        onChangeText={(text) => setSleepTime(text)}
        placeholder="请输入睡眠时间"
      /> 小时</Text>
      <Text>运动 - 类型:</Text>
      <TextInput
        value={exerciseType}
        onChangeText={(text) => setExerciseType(text)}
        placeholder="请输入运动类型（如跑步、健走）"
      />
      <Text>今日已消耗:</Text>
      <TextInput
        value={caloriesBurned}
        onChangeText={(text) => setCaloriesBurned(text)}
        placeholder="请输入消耗千卡数"
      />
      <Text>今日运动:</Text>
      <TextInput
        value={isExercise达标}
        onChangeText={(text) => setIsExercise达标(text)}
        placeholder="请输入达标情况（已达标/未达标）"
      />
      <Text>已坚持运动天数:</Text>
      <TextInput
        value={exerciseDays}
        onChangeText={(text) => setExerciseDays(text)}
        placeholder="请输入坚持天数"
      />
      <Button title="提交" onPress={handleSubmit} />
    </View>
  );
};

export default DataInput;