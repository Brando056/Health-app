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

  // 30分钟的秒数
  const THIRTY_MINUTES = 30 * 60;
  const CIRCLE_RADIUS = 100;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
  const SVG_SIZE = 220; // SVG容器大小
  const CENTER = SVG_SIZE / 2; // 中心点坐标

  useEffect(() => {
    loadWeight();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prevTime => {
          const newTime = prevTime + 1;
          // 计算圆形进度
          const progress = (newTime % THIRTY_MINUTES) / THIRTY_MINUTES;
          setCircleProgress(progress);
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const loadWeight = async () => {
    const weightData = await AsyncStorage.getItem('weight');
    if (weightData) {
      setWeight(parseFloat(weightData));
    }
  };

  const calculateCalories = (duration: number) => {
    const baseCalories = {
      running: 8,
      walking: 5,
      jumping: 9
    }[type] || 0;

    // 将分钟转换为小时
    return baseCalories * (duration / 60) * weight * 1.05;
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    setIsRunning(false);
    const duration = Math.floor(time / 60); // 转换为分钟
    const calories = calculateCalories(duration);

    // 保存运动数据
    const today = new Date().toDateString();
    const exerciseDataStr = await AsyncStorage.getItem(`exercise_${today}`);
    const exerciseData = exerciseDataStr ? JSON.parse(exerciseDataStr) : [];
    
    exerciseData.push({
      type,
      duration,
      calories,
      timestamp: Date.now() // 添加时间戳
    });

    await AsyncStorage.setItem(`exercise_${today}`, JSON.stringify(exerciseData));

    // 返回上一页
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {type === 'running' ? '跑步' : type === 'walking' ? '徒步' : '跳绳'}
      </Text>
      
      <View style={styles.timerContainer}>
        <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
          {/* 背景圆 */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={CIRCLE_RADIUS}
            stroke="#e0e0e0"
            strokeWidth={10}
            fill="none"
          />
          {/* 进度圆 */}
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
        
        {/* 精确居中的计时器文本 */}
        <View style={[styles.timeDisplay, { 
          top: CENTER - 25, 
          left: CENTER - 40 
        }]}>
          <Text style={styles.timer}>{formatTime(time)}</Text>
        </View>
        
        <Text style={styles.calories}>
          预计消耗: {Math.round(calculateCalories(Math.floor(time / 60)))} 卡
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {!isRunning ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={() => setIsRunning(true)}
          >
            <Text style={styles.buttonText}>开始</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={handleStop}
          >
            <Text style={styles.buttonText}>结束</Text>
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
    height: 220, // 与SVG高度一致
    width: 220  // 与SVG宽度一致
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
    width: 80 // 确保文本有固定宽度以便居中
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