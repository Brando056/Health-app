import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';

export default function Health() {
    const router = useRouter();
    const [lastDrinkTime, setLastDrinkTime] = useState<number | null>(null);
    const [lastSleepTime, setLastSleepTime] = useState<number | null>(null);
    const [drinkAmount, setDrinkAmount] = useState(0);
    const [sleepHours, setSleepHours] = useState(0);
    const [healthScore, setHealthScore] = useState(0);

    useEffect(() => {
        loadData();

        // Set a timer to reset data at midnight
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const timeUntilMidnight = midnight.getTime() - now.getTime();

        const timer = setTimeout(async () => {
            await AsyncStorage.setItem('dailyDrinkAmount', '0');
            await AsyncStorage.setItem('lastSleepHours', '0');
            await AsyncStorage.setItem('lastResetDate', new Date().toDateString());
            setDrinkAmount(0);
            setSleepHours(0);
        }, timeUntilMidnight);

        return () => clearTimeout(timer);
    }, []);

    const loadData = async () => {
        const lastDrink = await AsyncStorage.getItem('lastDrinkTime');
        const drinkAmountData = await AsyncStorage.getItem('dailyDrinkAmount');
        const lastResetDate = await AsyncStorage.getItem('lastResetDate');
        const today = new Date().toDateString();

        if (lastResetDate !== today) {
            // If it's a new day, reset data
            await AsyncStorage.setItem('dailyDrinkAmount', '0');
            await AsyncStorage.setItem('lastResetDate', today);
            setDrinkAmount(0);
        } else if (drinkAmountData) {
            setDrinkAmount(parseInt(drinkAmountData));
        }

        if (lastDrink) {
            setLastDrinkTime(parseFloat(lastDrink));
        }

        const lastSleep = await AsyncStorage.getItem('lastSleepTime');
        const sleepHoursData = await AsyncStorage.getItem('lastSleepHours');
        if (lastSleep) {
            setLastSleepTime(parseFloat(lastSleep));
        }
        if (sleepHoursData) {
            setSleepHours(parseFloat(sleepHoursData));
        }

        // Calculate health score
        calculateHealthScore();
    };

    const calculateHealthScore = async () => {
        // Get weight data
        const weightData = await AsyncStorage.getItem('weight');
        const weight = weightData ? parseFloat(weightData) : 60;

        // Get today's exercise data
        const today = new Date().toDateString();
        const exerciseDataStr = await AsyncStorage.getItem(`exercise_${today}`);
        const exerciseData = exerciseDataStr ? JSON.parse(exerciseDataStr) : [];
        
        // Calculate total calories burned
        const totalCalories = exerciseData.reduce((sum: any, data: { calories: any; }) => sum + data.calories, 0);
        
        // Calculate exercise score (40% weight)
        const exerciseScore = Math.min(totalCalories / (5 * weight * 0.83 * 1.05), 1) * 0.4;
        
        // Calculate hydration score (30% weight)
        const drinkScore = Math.min(drinkAmount / 2000, 1) * 0.3;
        
        // Calculate sleep score (30% weight)
        const sleepScore = Math.min(sleepHours / 8, 1) * 0.3;
        
        // Calculate total score
        const totalScore = exerciseScore + drinkScore + sleepScore;
        setHealthScore(totalScore);
    };

    const getTimeSinceLastDrink = () => {
        if (lastDrinkTime) {
            const now = Date.now();
            const diff = now - lastDrinkTime;
            return Math.floor(diff / (1000 * 60));
        }
        return 'No record';
    };

    const getDrinkBarIndex = () => {
        const ratio = drinkAmount / 1600;
        if (ratio < 0.1) return 0;
        if (ratio < 0.2) return 1;
        if (ratio < 0.3) return 2;
        if (ratio < 0.4) return 3;
        if (ratio < 0.5) return 4;
        if (ratio < 0.6) return 5;
        if (ratio < 0.7) return 6;
        if (ratio < 0.8) return 7;
        if (ratio < 0.9) return 8;
        return 9;
    };

    const getSleepBarIndex = () => {
        const ratio = sleepHours / 10;
        if (ratio < 0.1) return 0;
        if (ratio < 0.2) return 1;
        if (ratio < 0.3) return 2;
        if (ratio < 0.4) return 3;
        if (ratio < 0.5) return 4;
        if (ratio < 0.6) return 5;
        if (ratio < 0.7) return 6;
        if (ratio < 0.8) return 7;
        if (ratio < 0.9) return 8;
        return 9;
    };

    const getHealthStatus = () => {
        if (healthScore < 0.6) return { color: '#999', text: 'Failing' };
        if (healthScore < 0.7) return { color: '#FFD700', text: 'Pass' };
        if (healthScore < 0.8) return { color: '#FFA500', text: 'Good' };
        return { color: '#4CAF50', text: 'Excellent' };
    };

    const healthStatus = getHealthStatus();

    const clearData = async () => {
        const today = new Date().toDateString();
        await AsyncStorage.setItem('dailyDrinkAmount', '0');
        await AsyncStorage.setItem('lastSleepHours', '0');
        await AsyncStorage.setItem('lastResetDate', today);
        setDrinkAmount(0);
        setSleepHours(0);
        calculateHealthScore();
    };

    const renderNavigation = () => (
        <View style={styles.navigationContainer}>
          {['Health', 'Sport', 'Chart', 'Me'].map((page) => (
            <TouchableOpacity
              key={page}
              style={[
                styles.navButton, 
                page === 'Health' && styles.activeButton
              ]}
              onPress={() => router.push(`./${page}`)}
            >
              <Text style={styles.buttonText}>{page}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );

    return (
        <ScrollView style={styles.container}>
            {/* Water Intake Module */}
            <TouchableOpacity
                style={styles.module}
                onPress={() => router.push({ pathname: "./Drink_DataInput" })}
            >
                <Text style={styles.moduleTitle}>Water Intake</Text>
                <Text style={styles.moduleContent}>
                    Drank {drinkAmount}ml today, {getTimeSinceLastDrink()} minutes since last drink
                </Text>
                <View style={styles.barContainer}>
                    {Array.from({ length: 10 }).map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.barItem,
                                index <= getDrinkBarIndex() && styles.filledBarItem
                            ]}
                        />
                    ))}
                    <Text style={styles.barLabelLeft}>Drink more</Text>
                    <Text style={styles.barLabelRight}>Excellent</Text>
                </View>
            </TouchableOpacity>
    
            {/* Sleep Module */}
            <TouchableOpacity
                style={styles.module}
                onPress={() => router.push({ pathname: "./Sleep_DataInput" })}
            >
                <Text style={styles.moduleTitle}>Sleep</Text>
                <Text style={styles.moduleContent}>Slept {sleepHours} hours last night</Text>
                <View style={styles.barContainer}>
                    {Array.from({ length: 10 }).map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.barItem,
                                index <= getSleepBarIndex() && styles.filledBarItem
                            ]}
                        />
                    ))}
                    <Text style={styles.barLabelLeft}>Needs improvement</Text>
                    <Text style={styles.barLabelRight}>Excellent</Text>
                </View>
            </TouchableOpacity>
    
            {/* Health Score */}
            <View style={styles.module}>
                <Text style={styles.moduleTitle}>Health Score</Text>
                <View style={styles.healthScoreContainer}>
                    <Svg width={200} height={200}>
                        <Circle cx={100} cy={100} r={90} stroke="#e0e0e0" strokeWidth={10} fill="none" />
                        <Circle
                            cx={100}
                            cy={100}
                            r={90}
                            stroke={healthStatus.color}
                            strokeWidth={10}
                            fill="none"
                            strokeDasharray={565.48}
                            strokeDashoffset={565.48 * (1 - healthScore)}
                            strokeLinecap="round"
                            transform={`rotate(-90 100 100)`}
                        />
                    </Svg>
                    <Text style={[styles.healthScore, { color: healthStatus.color }]}>
                        {healthStatus.text}
                    </Text>
                </View>
            </View>
    
            {/* Clear Today's Data */}
            <TouchableOpacity style={styles.clearButton} onPress={clearData}>
                <Text style={styles.clearButtonText}>Clear Today's Data</Text>
            </TouchableOpacity>
    
            {/* Bottom Navigation */}
            {renderNavigation()}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20
    },
    module: {
        backgroundColor: '#f8f8f8',
        padding: 20,
        borderRadius: 16,
        marginBottom: 30
    },
    moduleTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333'
    },
    moduleContent: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10
    },
    barContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        position: 'relative'
    },
    barItem: {
        flex: 1,
        height: 20,
        marginHorizontal: 1,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#ccc'
    },
    filledBarItem: {
        backgroundColor: '#4CAF50'
    },
    barLabelLeft: {
        position: 'absolute',
        left: 0,
        bottom: -20,
        fontSize: 12,
        color: '#666'
    },
    barLabelRight: {
        position: 'absolute',
        right: 0,
        bottom: -20,
        fontSize: 12,
        color: '#666'
    },
    healthScoreContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    healthScore: {
        position: 'absolute',
        fontSize: 24,
        fontWeight: 'bold'
    },
    clearButton: {
        backgroundColor: '#f44336',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20
    },
    clearButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingVertical: 10,
        paddingHorizontal: 15,
    
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
//