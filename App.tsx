import React from 'react';
import { View } from 'react-native';
import TimeTriggerReminder from './app/timeTriggerReminder';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Index from './app/index';
import DataInput from './app/dataInput';
import DrinkCountWeeklyChart from './app/Chart';
import Me from './app/Me';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <TimeTriggerReminder />
      <Stack.Navigator>
        <Stack.Screen name="Index" component={Index} />
        <Stack.Screen name="DataInput" component={DataInput} />
        <Stack.Screen name="Charts" component={DrinkCountWeeklyChart} />
        <Stack.Screen name="Me" component={Me} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;

