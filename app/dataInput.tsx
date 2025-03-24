import React, { useState } from 'react';
import { Text, TextInput, Button, View } from 'react-native';
import { useRouter } from "expo-router";

const DataInput = () => {
  const [sleepTime, setSleepTime] = useState('');
  const [drinkCount, setDrinkCount] = useState('');
  const router = useRouter();

  const handleSubmit = () => {
    // 处理数据提交逻辑
    console.log('睡眠时间:', sleepTime);
    console.log('饮水次数:', drinkCount);
    router.back(); // 提交后返回首页
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