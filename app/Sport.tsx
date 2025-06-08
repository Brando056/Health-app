import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator, 
  AppState, 
  AppStateStatus,
  Platform,
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import * as ActivityRecognition from 'expo-activity-recognition';

interface ExerciseData {
  type: string;
  duration: number;
  calories: number;
  timestamp: number;
}

// 定义运动类型及其图标
const EXERCISE_TYPES = [
  { key: 'running', name: '跑步', icon: 'directions-run' as const, color: '#FF6B6B' },
  { key: 'walking', name: '徒步', icon: 'directions-walk' as const, color: '#4ECDC4' },
  { key: 'jumping', name: '跳绳', icon: 'fitness-center' as const, color: '#FFD166' }
];

export default function Sport() {
  const router = useRouter();
  const [steps, setSteps] = useState(0);
  const [weight, setWeight] = useState(60);
  const [exerciseData, setExerciseData] = useState<ExerciseData[]>([]);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  
  const isInitializedRef = useRef(false);
  const stepSubscriptionRef = useRef<Pedometer.Subscription | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const getTodayKey = useCallback(() => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }, []);

  // 修复后的权限请求函数
  const requestPedometerPermission = useCallback(async () => {
    try {
      // 检查基础计步权限
      const { status } = await Pedometer.requestPermissionsAsync();
      
      if (status !== 'granted') {
        setPermissionDenied(true);
        setPermissionError('需要计步权限才能跟踪您的步数，请前往设置开启权限');
        return false;
      }
      
      
      
      return true;
    } catch (error) {
      console.error('请求计步权限失败:', error);
      setPermissionDenied(true);
      setPermissionError('请求权限时发生错误');
      return false;
    }
  }, []);

  const checkPedometerAvailability = useCallback(async () => {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(isAvailable);
      
      if (!isAvailable) {
        console.log('设备不支持计步功能');
        setPermissionError('您的设备不支持计步功能');
      }
      return isAvailable;
    } catch (error) {
      console.error('检查计步器失败:', error);
      setIsPedometerAvailable(false);
      setPermissionError('检查计步功能时发生错误');
      return false;
    }
  }, []);

  const getStepsData = useCallback(async () => {
    try {
      const todayKey = getTodayKey();
      
      const savedSteps = await AsyncStorage.getItem(`steps_${todayKey}`);
      if (savedSteps) {
        setSteps(parseInt(savedSteps));
      }
      
      if (isPedometerAvailable && !permissionDenied) {
        try {
          if (Platform.OS === 'ios') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const { steps } = await Pedometer.getStepCountAsync(startOfDay, new Date());
            setSteps(steps);
            await AsyncStorage.setItem(`steps_${todayKey}`, steps.toString());
          } else {
            if (stepSubscriptionRef.current) {
              stepSubscriptionRef.current.remove();
            }
            
            stepSubscriptionRef.current = Pedometer.watchStepCount(result => {
              console.log('Android 步数更新:', result.steps);
              setSteps(result.steps);
              AsyncStorage.setItem(`steps_${todayKey}`, result.steps.toString());
            });
          }
        } catch (error) {
          console.error('获取步数失败:', error);
          setPermissionError('获取步数失败，请检查权限设置');
        }
      }
    } catch (error) {
      console.error('获取步数数据失败:', error);
      setPermissionError('获取步数数据时发生错误');
    }
  }, [isPedometerAvailable, permissionDenied, getTodayKey]);

  const loadData = useCallback(async () => {
    try {
      const [weightData, exerciseDataStr] = await Promise.all([
        AsyncStorage.getItem('weight'),
        AsyncStorage.getItem(`exercise_${getTodayKey()}`)
      ]);

      if (weightData) setWeight(parseFloat(weightData));
      if (exerciseDataStr) {
        const data = JSON.parse(exerciseDataStr);
        setExerciseData(data.sort((a: ExerciseData, b: ExerciseData) => b.timestamp - a.timestamp));
      }

      await getStepsData();
    } catch (error) {
      console.error('加载数据失败:', error);
      setPermissionError('加载数据时发生错误');
    }
  }, [getStepsData, getTodayKey]);

  const initialize = useCallback(async () => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    setIsLoading(true);
    setPermissionError('');
    
    try {
      console.log('开始初始化...');
      
      const isAvailable = await checkPedometerAvailability();
      
      if (isAvailable) {
        await requestPedometerPermission();
      }
      
      await loadData();
      
      console.log('初始化完成');
    } catch (error) {
      console.error('初始化失败:', error);
      setPermissionError('初始化运动功能时发生错误');
    } finally {
      setIsLoading(false);
    }
  }, [requestPedometerPermission, checkPedometerAvailability, loadData]);

  useEffect(() => {
    console.log('组件挂载');
    
    initialize();
    
    const appStateChangeHandler = (nextAppState: AppStateStatus) => {
      console.log('应用状态变化:', nextAppState);
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('应用从后台恢复，刷新步数');
        loadData();
      }
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', appStateChangeHandler);

    return () => {
      console.log('组件卸载');
      subscription.remove();
      
      if (stepSubscriptionRef.current) {
        stepSubscriptionRef.current.remove();
        stepSubscriptionRef.current = null;
      }
    };
  }, [initialize, loadData]);

  const openAppSettings = useCallback(() => {
    Linking.openSettings().catch(() => {
      Alert.alert('无法打开设置', '请手动前往系统设置开启权限');
    });
  }, []);

  const calculateCalories = useCallback((type: string, duration: number) => {
    const baseCalories = {
      running: 8,
      walking: 5,
      jumping: 9
    }[type] || 0;

    return baseCalories * (duration / 60) * weight * 1.05;
  }, [weight]);

  const getExerciseDataByType = useCallback((type: string) => {
    return exerciseData.filter(data => data.type === type);
  }, [exerciseData]);

  const getTotalExerciseData = useCallback((type: string) => {
    const filteredData = getExerciseDataByType(type);
    const totalDuration = filteredData.reduce((sum, data) => sum + data.duration, 0);
    const totalCalories = filteredData.reduce((sum, data) => sum + data.calories, 0);
    return { totalDuration, totalCalories };
  }, [getExerciseDataByType]);

  const getTotalCalories = useCallback(() => {
    return exerciseData.reduce((sum, data) => sum + data.calories, 0);
  }, [exerciseData]);

  const clearData = useCallback(async () => {
    Alert.alert(
      '确认',
      '确定要清空今日的所有运动数据吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '清空', 
          onPress: async () => {
            const todayKey = getTodayKey();
            await AsyncStorage.setItem(`exercise_${todayKey}`, '[]');
            setExerciseData([]);
          }
        }
      ]
    );
  }, [getTodayKey]);

  const navigateToExerciseTimer = (type: string) => {
    router.push({ 
      pathname: "./Exercise_Timer", 
      params: { type } 
    });
  };

  const renderExerciseModule = (type: string) => {
    const exerciseType = EXERCISE_TYPES.find(t => t.key === type);
    
    if (!exerciseType) return null;
    
    const { name, icon, color } = exerciseType;
    const { totalDuration, totalCalories } = getTotalExerciseData(type);
    const records = getExerciseDataByType(type);

    return (
      <TouchableOpacity
        key={type}
        style={[styles.exerciseModule, { borderLeftColor: color }]}
        onPress={() => navigateToExerciseTimer(type)}
      >
        <View style={styles.exerciseHeader}>
          <MaterialIcons name={icon} size={24} color={color} />
          <Text style={[styles.exerciseTitle, { color }]}>{name}</Text>
        </View>
        
        <Text style={styles.exerciseStats}>
          今日总计: {totalDuration}分钟，消耗{Math.round(totalCalories)}千卡
        </Text>
        
        {records.length > 0 && (
          <View style={styles.recordsContainer}>
            {records.slice(0, 3).map((record, index) => (
              <Text key={index} style={styles.recordItem}>
                {new Date(record.timestamp).toLocaleTimeString()} - 
                {record.duration}分钟 ({Math.round(record.calories)}千卡)
              </Text>
            ))}
            {records.length > 3 && (
              <Text style={styles.moreRecords}>+ {records.length - 3} 条更多记录</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderNavigation = () => (
    <View style={styles.navigationContainer}>
      {['Health', 'Sport', 'Chart', 'Me'].map((page) => (
        <TouchableOpacity
          key={page}
          style={[
            styles.navButton, 
            page === 'Sport' && styles.activeButton
          ]}
          onPress={() => router.push(`./${page}`)}
        >
          <Text style={styles.buttonText}>{page}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPermissionError = () => (
    <View style={styles.permissionContainer}>
      <Text style={styles.permissionText}>{permissionError}</Text>
      <TouchableOpacity
        style={styles.permissionButton}
        onPress={openAppSettings}
      >
        <Text style={styles.permissionButtonText}>前往设置</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>加载运动数据中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.stepsModule}>
          <Text style={styles.stepsTitle}>今日步数</Text>
          
          {permissionError ? (
            renderPermissionError()
          ) : isPedometerAvailable && !permissionDenied ? (
            <Text style={styles.stepsNumber}>{steps.toLocaleString()}</Text>
          ) : (
            <Text style={styles.stepsDisabled}>计步功能不可用</Text>
          )}
          
          <Text style={styles.stepsSubtitle}>≈ {Math.round(steps * 0.7)} 米</Text>
        </View>

        {EXERCISE_TYPES.map(type => renderExerciseModule(type.key))}

        <View style={styles.totalCaloriesModule}>
          <Text style={styles.totalCaloriesTitle}>今日总消耗</Text>
          <Text style={styles.totalCaloriesNumber}>{Math.round(getTotalCalories())} 千卡</Text>
          <Text style={styles.caloriesSubtitle}>
            相当于 {Math.round(getTotalCalories() / 770)} 个苹果
          </Text>
        </View>

        {exerciseData.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearData}
          >
            <MaterialIcons name="delete" size={20} color="white" />
            <Text style={styles.clearButtonText}>清空今日数据</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderNavigation()}
    </ScrollView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#555',
  },
  stepsModule: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  stepsTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  stepsNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2E86C1',
  },
  stepsDisabled: {
    fontSize: 18,
    color: '#E74C3C',
    marginVertical: 10,
    textAlign: 'center',
  },
  stepsSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  permissionContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  permissionText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exerciseModule: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  exerciseStats: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  recordsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 10,
  },
  recordItem: {
    fontSize: 14,
    color: '#777',
    marginBottom: 5,
  },
  moreRecords: {
    fontSize: 14,
    color: '#2E86C1',
    fontStyle: 'italic',
  },
  totalCaloriesModule: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  totalCaloriesTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  totalCaloriesNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  caloriesSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  clearButton: {
    backgroundColor: '#E74C3C',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingVertical: 10,
    paddingHorizontal: 15,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navButton: {
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#4ECDC4',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});