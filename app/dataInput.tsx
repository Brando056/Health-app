import React, { useState } from 'react';
import { Text, TextInput, Button, View } from 'react-native';
import { useRouter } from "expo-router";

const DataInput = () => {
  const [sleepTime, setSleepTime] = useState('');
  const [drinkCount, setDrinkCount] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://localhost:5000/submit_health_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sleep_time: sleepTime,
          drink_count: parseInt(drinkCount)
        })
      });

      const data = await response.json();
      console.log(data);
      router.back(); // 提交后返回首页
    } catch (error) {
      console.error('数据提交失败:', error);
    }
  };

  return (
    <View>
      <Text>睡眠时间:</Text>
      <TextInput
        value={sleepTime}
        onChangeText={(text) => setSleepTime(text)}
        placeholder="请输入睡眠时间"
      />
      <Text>饮水次数:</Text>
      <TextInput
        value={drinkCount}
        onChangeText={(text) => setDrinkCount(text)}
        placeholder="请输入饮水次数"
      />
      <Button title="提交" onPress={handleSubmit} />
    </View>
  );
};

export default DataInput;