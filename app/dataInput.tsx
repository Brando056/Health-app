import React, { useState } from 'react';
import { Text, TextInput, Button, View } from 'react-native';
import { useRouter } from "expo-router";

const DataInput = () => {
  const [sleepTime, setSleepTime] = useState('');
  const [drinkCount, setDrinkCount] = useState('');
  const router = useRouter();

  // Handle form submission
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
      router.back(); // Go back to the previous page after submission
    } catch (error) {
      console.error('Failed to submit data:', error);
    }
  };

  return (
    <View>
      <Text>Sleep Duration:</Text>
      <TextInput
        value={sleepTime}
        onChangeText={(text) => setSleepTime(text)}
        placeholder="Enter sleep duration"
      />
      <Text>Drink Count:</Text>
      <TextInput
        value={drinkCount}
        onChangeText={(text) => setDrinkCount(text)}
        placeholder="Enter drink count"
      />
      <Button title="Submit" onPress={handleSubmit} />
    </View>
  );
};

export default DataInput;
