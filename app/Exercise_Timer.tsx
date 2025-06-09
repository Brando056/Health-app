import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';

export default function ExerciseTimer() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const type = params.type as string;
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [weight, setWeight] = useState(60);
  const [circleProgress, setCircleProgress] = useState(0);

  // 30 minutes in seconds
  const THIRTY_MINUTES = 30 * 60;
  const CIRCLE_RADIUS = 100;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
  const SVG_SIZE = 220; // SVG container size
  const CENTER = SVG_SIZE / 2; // Center point coordinates

  // Load user's weight from storage on mount
  useEffect(() => {
    loadWeight();
  }, []);

  // Timer effect that runs when timer is active
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prevTime => {
          const newTime = prevTime + 1;
          // Calculate circular progress
          const progress = (newTime % THIRTY_MINUTES) / THIRTY_MINUTES;
          setCircleProgress(progress);
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Load weight from AsyncStorage
  const loadWeight = async () => {
    const weightData = await AsyncStorage.getItem('weight');
    if (weightData) {
      setWeight(parseFloat(weightData));
    }
  };

  // Calculate calories burned based on exercise type
  const calculateCalories = (duration: number) => {
    const baseCalories = {
      running: 8,
      walking: 5,
      jumping: 9
    }[type] || 0;

    // Convert minutes to hours
    return baseCalories * (duration / 60) * weight * 1.05;
  };

  // Format seconds into MM:SS format
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle stopping the timer and save data
  const handleStop = async () => {
    setIsRunning(false);
    const duration = Math.floor(time / 60); // Convert to minutes
    const calories = calculateCalories(duration);

    // Save exercise data
    const today = new Date().toDateString();
    const exerciseDataStr = await AsyncStorage.getItem(`exercise_${today}`);
    const exerciseData = exerciseDataStr ? JSON.parse(exerciseDataStr) : [];
    
    exerciseData.push({
      type,
      duration,
      calories,
      timestamp: Date.now() // Add timestamp
    });

    await AsyncStorage.setItem(`exercise_${today}`, JSON.stringify(exerciseData));

    // Navigate back to previous screen
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {type === 'running' ? 'Running' : type === 'walking' ? 'Walking' : 'Jump Rope'}
      </Text>
      
      <View style={styles.timerContainer}>
        <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
          {/* Background circle */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={CIRCLE_RADIUS}
            stroke="#e0e0e0"
            strokeWidth={10}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={CIRCLE_RADIUS}
            stroke="#4CAF50"
            strokeWidth={10}
            fill="none"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={CIRCLE_CIRCUMFERENCE * (1 - circleProgress)}
            strokeLinecap="round"
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />
        </Svg>
        
        {/* Centered timer text */}
        <View style={[styles.timeDisplay, { 
          top: CENTER - 25, 
          left: CENTER - 40 
        }]}>
          <Text style={styles.timer}>{formatTime(time)}</Text>
        </View>
        
        <Text style={styles.calories}>
          Estimated Burn: {Math.round(calculateCalories(Math.floor(time / 60)))} cal
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {!isRunning ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={() => setIsRunning(true)}
          >
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={handleStop}
          >
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
    height: 220, // Matches SVG height
    width: 220  // Matches SVG width
  },
  timeDisplay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  timer: {
    fontSize: 39,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 80 // Fixed width for centering
  },
  calories: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    textAlign: 'center'
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center'
  },
  button: {
    width: 200,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10
  },
  startButton: {
    backgroundColor: '#4CAF50'
  },
  stopButton: {
    backgroundColor: '#f44336'
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  }
});