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

// Define exercise types and their icons
const EXERCISE_TYPES = [
  { key: 'running', name: 'Running', icon: 'directions-run' as const, color: '#FF6B6B' },
  { key: 'walking', name: 'Walking', icon: 'directions-walk' as const, color: '#4ECDC4' },
  { key: 'jumping', name: 'Jump Rope', icon: 'fitness-center' as const, color: '#FFD166' }
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

  // Generate key for today's date
  const getTodayKey = useCallback(() => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }, []);

  // Request pedometer permission
  const requestPedometerPermission = useCallback(async () => {
    try {
      const { status } = await Pedometer.requestPermissionsAsync();
      
      if (status !== 'granted') {
        setPermissionDenied(true);
        setPermissionError('Step tracking requires permission, please enable in settings');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Pedometer permission request failed:', error);
      setPermissionDenied(true);
      setPermissionError('Error requesting permission');
      return false;
    }
  }, []);

  // Check if pedometer is available
  const checkPedometerAvailability = useCallback(async () => {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(isAvailable);
      
      if (!isAvailable) {
        console.log('Device does not support pedometer');
        setPermissionError('Your device does not support step counting');
      }
      return isAvailable;
    } catch (error) {
      console.error('Pedometer check failed:', error);
      setIsPedometerAvailable(false);
      setPermissionError('Error checking pedometer capability');
      return false;
    }
  }, []);

  // Get step count data
  const getStepsData = useCallback(async () => {
    try {
      const todayKey = getTodayKey();
      
      // Load saved steps
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
            // Remove existing subscription if any
            if (stepSubscriptionRef.current) {
              stepSubscriptionRef.current.remove();
            }
            
            // Watch for step count updates on Android
            stepSubscriptionRef.current = Pedometer.watchStepCount(result => {
              setSteps(result.steps);
              AsyncStorage.setItem(`steps_${todayKey}`, result.steps.toString());
            });
          }
        } catch (error) {
          console.error('Step count fetch failed:', error);
          setPermissionError('Failed to get steps, check permissions');
        }
      }
    } catch (error) {
      console.error('Error getting step data:', error);
      setPermissionError('Error loading step data');
    }
  }, [isPedometerAvailable, permissionDenied, getTodayKey]);

  // Load user data from storage
  const loadData = useCallback(async () => {
    try {
      const [weightData, exerciseDataStr] = await Promise.all([
        AsyncStorage.getItem('weight'),
        AsyncStorage.getItem(`exercise_${getTodayKey()}`)
      ]);

      if (weightData) setWeight(parseFloat(weightData));
      if (exerciseDataStr) {
        const data = JSON.parse(exerciseDataStr);
        // Sort by most recent first
        setExerciseData(data.sort((a: ExerciseData, b: ExerciseData) => b.timestamp - a.timestamp));
      }

      await getStepsData();
    } catch (error) {
      console.error('Data load failed:', error);
      setPermissionError('Error loading data');
    }
  }, [getStepsData, getTodayKey]);

  // Initialize component
  const initialize = useCallback(async () => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    setIsLoading(true);
    setPermissionError('');
    
    try {
      const isAvailable = await checkPedometerAvailability();
      
      if (isAvailable) {
        await requestPedometerPermission();
      }
      
      await loadData();
    } catch (error) {
      console.error('Initialization failed:', error);
      setPermissionError('Error initializing sports features');
    } finally {
      setIsLoading(false);
    }
  }, [requestPedometerPermission, checkPedometerAvailability, loadData]);

  // Setup app state listener
  useEffect(() => {
    initialize();
    
    // Handle app coming back from background
    const appStateChangeHandler = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        loadData(); // Refresh data when app becomes active
      }
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', appStateChangeHandler);

    // Clean up on unmount
    return () => {
      subscription.remove();
      
      if (stepSubscriptionRef.current) {
        stepSubscriptionRef.current.remove();
        stepSubscriptionRef.current = null;
      }
    };
  }, [initialize, loadData]);

  // Open settings app
  const openAppSettings = useCallback(() => {
    Linking.openSettings().catch(() => {
      Alert.alert('Cannot open settings', 'Please go to system settings manually');
    });
  }, []);

  // Calculate calories burned
  const calculateCalories = useCallback((type: string, duration: number) => {
    const baseCalories = {
      running: 8,
      walking: 5,
      jumping: 9
    }[type] || 0;

    return baseCalories * (duration / 60) * weight * 1.05;
  }, [weight]);

  // Filter exercise data by type
  const getExerciseDataByType = useCallback((type: string) => {
    return exerciseData.filter(data => data.type === type);
  }, [exerciseData]);

  // Calculate totals for an exercise type
  const getTotalExerciseData = useCallback((type: string) => {
    const filteredData = getExerciseDataByType(type);
    const totalDuration = filteredData.reduce((sum, data) => sum + data.duration, 0);
    const totalCalories = filteredData.reduce((sum, data) => sum + data.calories, 0);
    return { totalDuration, totalCalories };
  }, [getExerciseDataByType]);

  // Calculate total calories burned today
  const getTotalCalories = useCallback(() => {
    return exerciseData.reduce((sum, data) => sum + data.calories, 0);
  }, [exerciseData]);

  // Clear today's exercise data with confirmation
  const clearData = useCallback(async () => {
    Alert.alert(
      'Confirm',
      'Are you sure you want to clear all exercise data for today?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          onPress: async () => {
            const todayKey = getTodayKey();
            await AsyncStorage.setItem(`exercise_${todayKey}`, '[]');
            setExerciseData([]);
          }
        }
      ]
    );
  }, [getTodayKey]);

  // Navigate to exercise timer screen
  const navigateToExerciseTimer = (type: string) => {
    router.push({ 
      pathname: "./Exercise_Timer", 
      params: { type } 
    });
  };

  // Render an exercise module
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
          Today: {totalDuration} mins, {Math.round(totalCalories)} kcal burned
        </Text>
        
        {records.length > 0 && (
          <View style={styles.recordsContainer}>
            {records.slice(0, 3).map((record, index) => (
              <Text key={index} style={styles.recordItem}>
                {new Date(record.timestamp).toLocaleTimeString()} - 
                {record.duration} mins ({Math.round(record.calories)} kcal)
              </Text>
            ))}
            {records.length > 3 && (
              <Text style={styles.moreRecords}>+ {records.length - 3} more records</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Bottom navigation
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

  // Render permission error UI
  const renderPermissionError = () => (
    <View style={styles.permissionContainer}>
      <Text style={styles.permissionText}>{permissionError}</Text>
      <TouchableOpacity
        style={styles.permissionButton}
        onPress={openAppSettings}
      >
        <Text style={styles.permissionButtonText}>Go to Settings</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading sports data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Steps tracker section */}
        <View style={styles.stepsModule}>
          <Text style={styles.stepsTitle}>Today's Steps</Text>
          
          {permissionError ? (
            renderPermissionError()
          ) : isPedometerAvailable && !permissionDenied ? (
            <Text style={styles.stepsNumber}>{steps.toLocaleString()}</Text>
          ) : (
            <Text style={styles.stepsDisabled}>Step counter not available</Text>
          )}
          
          <Text style={styles.stepsSubtitle}>≈ {Math.round(steps * 0.7)} meters</Text>
        </View>

        {/* Exercise modules */}
        {EXERCISE_TYPES.map(type => renderExerciseModule(type.key))}

        {/* Total calories section */}
        <View style={styles.totalCaloriesModule}>
          <Text style={styles.totalCaloriesTitle}>Total Burned Today</Text>
          <Text style={styles.totalCaloriesNumber}>{Math.round(getTotalCalories())} kcal</Text>
          <Text style={styles.caloriesSubtitle}>
            Equivalent to {Math.round(getTotalCalories() / 770)} apples
          </Text>
        </View>

        {/* Clear data button (only shown if there's data) */}
        {exerciseData.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearData}
          >
            <MaterialIcons name="delete" size={20} color="white" />
            <Text style={styles.clearButtonText}>Clear Today's Data</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom navigation */}
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