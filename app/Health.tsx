import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Button } from 'react-native';
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

        // 设置每日零点重置的定时器
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
            // 如果是新的一天，重置数据
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

        // 计算健康分数
        calculateHealthScore();
    };

    const calculateHealthScore = async () => {
        // 获取体重数据
        const weightData = await AsyncStorage.getItem('weight');
        const weight = weightData ? parseFloat(weightData) : 60;

        // 获取今日运动数据
        const today = new Date().toDateString();
        const exerciseDataStr = await AsyncStorage.getItem(`exercise_${today}`);
        const exerciseData = exerciseDataStr ? JSON.parse(exerciseDataStr) : [];
        
        // 计算总消耗卡路里
        const totalCalories = exerciseData.reduce((sum: any, data: { calories: any; }) => sum + data.calories, 0);
        
        // 计算运动得分 (40%权重)
        const exerciseScore = Math.min(totalCalories / (5 * weight * 0.83 * 1.05), 1) * 0.4;
        
        // 计算饮水得分 (30%权重)
        const drinkScore = Math.min(drinkAmount / 2000, 1) * 0.3;
        
        // 计算睡眠得分 (30%权重)
        const sleepScore = Math.min(sleepHours / 8, 1) * 0.3;
        
        // 计算总分
        const totalScore = exerciseScore + drinkScore + sleepScore;
        setHealthScore(totalScore);
    };

    const getTimeSinceLastDrink = () => {
        if (lastDrinkTime) {
            const now = Date.now();
            const diff = now - lastDrinkTime;
            return Math.floor(diff / (1000 * 60));
        }
        return '无记录';
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
        if (healthScore < 0.6) return { color: '#999', text: '不及格' };
        if (healthScore < 0.7) return { color: '#FFD700', text: '合格' };
        if (healthScore < 0.8) return { color: '#FFA500', text: '良好' };
        return { color: '#4CAF50', text: '优秀' };
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

    return (
        <View style={styles.container}>
            {/* 饮水量模块 */}
            <TouchableOpacity
                style={styles.module}
                onPress={() => router.push({ pathname: "./Drink_DataInput" })}
            >
                <Text style={styles.moduleTitle}>饮水量</Text>
                <Text style={styles.moduleContent}>今日已饮水{drinkAmount}ml  已有 {getTimeSinceLastDrink()} 分钟未喝水</Text>
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
                    <Text style={styles.barLabelLeft}>该多喝水了</Text>
                    <Text style={styles.barLabelRight}>优秀</Text>
                </View>
            </TouchableOpacity>

            {/* 睡眠模块 */}
            <TouchableOpacity
                style={styles.module}
                onPress={() => router.push({ pathname: "./Sleep_DataInput" })}
            >
                <Text style={styles.moduleTitle}>睡眠</Text>
                <Text style={styles.moduleContent}>昨晚睡了 {sleepHours} 小时</Text>
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
                    <Text style={styles.barLabelLeft}>有待提高</Text>
                    <Text style={styles.barLabelRight}>优秀</Text>
                </View>
            </TouchableOpacity>

            {/* 健康评分模块 */}
            <View style={styles.module}>
                <Text style={styles.moduleTitle}>健康评分</Text>
                <View style={styles.healthScoreContainer}>
                    <Svg width={200} height={200}>
                        <Circle
                            cx={100}
                            cy={100}
                            r={90}
                            stroke="#e0e0e0"
                            strokeWidth={10}
                            fill="none"
                        />
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

            {/* 清空数据按钮 */}
            <TouchableOpacity
                style={styles.clearButton}
                onPress={clearData}
            >
                <Text style={styles.clearButtonText}>清空今日数据</Text>
            </TouchableOpacity>

            {/* 底部导航按钮 */}
            <View style={styles.bottomButtons}>
                <Button
                    title="Health"
                    onPress={() => router.push({ pathname: "./Health" })}
                />
                <Button
                    title="Sport"
                    onPress={() => router.push({ pathname: "./Sport" })}
                />
                <Button
                    title="Chart"
                    onPress={() => router.push({ pathname: "./Chart" })}
                />
                <Button
                    title="Me"
                    onPress={() => router.push({ pathname: "./Me" })}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff'
    },
    module: {
        backgroundColor: '#f8f8f8',
        padding: 20,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0'
    },
    moduleTitle: {
        fontSize: 20,
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
        marginTop: 8
    },
    barItem: {
        flex: 1,
        height: 20,
        borderWidth: 1,
        borderColor: '#ccc'
    },
    filledBarItem: {
        backgroundColor: '#4CAF50'
    },
    barLabelLeft: {
        position: 'absolute',
        left: 0,
        bottom: -20
    },
    barLabelRight: {
        position: 'absolute',
        right: 0,
        bottom: -20
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
    bottomButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0
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
    }
}); 