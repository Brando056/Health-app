import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Button, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pedometer } from 'expo-sensors';

interface ExerciseData {
    type: 'running' | 'walking' | 'jumping';
    duration: number;
    calories: number;
}

export default function Sport() {
    const router = useRouter();
    const [steps, setSteps] = useState(0);
    const [weight, setWeight] = useState(60);
    const [exerciseData, setExerciseData] = useState<ExerciseData[]>([]);
    const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);

    useEffect(() => {
        checkPedometerAvailability();
        loadData();
    }, []);

    const checkPedometerAvailability = async () => {
        const isAvailable = await Pedometer.isAvailableAsync();
        setIsPedometerAvailable(isAvailable);
        if (!isAvailable) {
            Alert.alert('提示', '您的设备不支持计步功能');
        }
    };

    const loadData = async () => {
        // 加载体重数据
        const weightData = await AsyncStorage.getItem('weight');
        if (weightData) {
            setWeight(parseFloat(weightData));
        }

        // 加载今日运动数据
        const today = new Date().toDateString();
        const exerciseDataStr = await AsyncStorage.getItem(`exercise_${today}`);
        if (exerciseDataStr) {
            setExerciseData(JSON.parse(exerciseDataStr));
        }

        // 获取今日步数
        if (isPedometerAvailable) {
            try {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                
                const { steps } = await Pedometer.getStepCountAsync(startOfDay, new Date());
                setSteps(steps);
                
                // 保存步数到本地存储，包括日期信息以便图表使用
                await AsyncStorage.setItem(`steps_${today}`, steps.toString());
            } catch (error) {
                console.error('获取步数失败:', error);
                // 如果获取失败，尝试从本地存储读取
                const savedSteps = await AsyncStorage.getItem(`steps_${today}`);
                if (savedSteps) {
                    setSteps(parseInt(savedSteps));
                }
            }
        }
    };

    const calculateCalories = (type: string, duration: number) => {
        const baseCalories = {
            running: 8,
            walking: 5,
            jumping: 9
        }[type] || 0;

        // 将分钟转换为小时
        return baseCalories * (duration / 60) * weight * 1.05;
    };

    const getTotalExerciseData = (type: string) => {
        const filteredData = exerciseData.filter(data => data.type === type);
        const totalDuration = filteredData.reduce((sum, data) => sum + data.duration, 0);
        const totalCalories = filteredData.reduce((sum, data) => sum + data.calories, 0);
        return { totalDuration, totalCalories };
    };

    const getTotalCalories = () => {
        return exerciseData.reduce((sum, data) => sum + data.calories, 0);
    };

    const clearData = async () => {
        const today = new Date().toDateString();
        await AsyncStorage.setItem(`exercise_${today}`, '[]');
        setExerciseData([]);
    };

    return (
        <View style={styles.container}>
            {/* 步数显示模块 */}
            <View style={styles.stepsModule}>
                <Text style={styles.stepsTitle}>今日步数</Text>
                <Text style={styles.stepsNumber}>{steps}</Text>
            </View>

            {/* 运动模块 */}
            <TouchableOpacity
                style={styles.exerciseModule}
                onPress={() => router.push({ pathname: "./Exercise_Timer", params: { type: 'running' } })}
            >
                <Text style={styles.exerciseTitle}>跑步</Text>
                {(() => {
                    const { totalDuration, totalCalories } = getTotalExerciseData('running');
                    return (
                        <Text style={styles.exerciseStats}>
                            今日跑步总计{totalDuration}分钟，消耗{Math.round(totalCalories)}千卡
                        </Text>
                    );
                })()}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.exerciseModule}
                onPress={() => router.push({ pathname: "./Exercise_Timer", params: { type: 'walking' } })}
            >
                <Text style={styles.exerciseTitle}>徒步</Text>
                {(() => {
                    const { totalDuration, totalCalories } = getTotalExerciseData('walking');
                    return (
                        <Text style={styles.exerciseStats}>
                            今日徒步总计{totalDuration}分钟，消耗{Math.round(totalCalories)}千卡
                        </Text>
                    );
                })()}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.exerciseModule}
                onPress={() => router.push({ pathname: "./Exercise_Timer", params: { type: 'jumping' } })}
            >
                <Text style={styles.exerciseTitle}>跳绳</Text>
                {(() => {
                    const { totalDuration, totalCalories } = getTotalExerciseData('jumping');
                    return (
                        <Text style={styles.exerciseStats}>
                            今日跳绳总计{totalDuration}分钟，消耗{Math.round(totalCalories)}千卡
                        </Text>
                    );
                })()}
            </TouchableOpacity>

            {/* 今日总消耗 */}
            <View style={styles.totalCaloriesModule}>
                <Text style={styles.totalCaloriesTitle}>今日总消耗</Text>
                <Text style={styles.totalCaloriesNumber}>{Math.round(getTotalCalories())} 千卡</Text>
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
    stepsModule: {
        backgroundColor: '#f0f0f0',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20
    },
    stepsTitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 10
    },
    stepsNumber: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#333'
    },
    exerciseModule: {
        backgroundColor: '#f8f8f8',
        padding: 20,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0'
    },
    exerciseTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333'
    },
    exerciseStats: {
        fontSize: 16,
        color: '#666'
    },
    totalCaloriesModule: {
        backgroundColor: '#f8f8f8',
        padding: 20,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        alignItems: 'center'
    },
    totalCaloriesTitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 10
    },
    totalCaloriesNumber: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#333'
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
    bottomButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0
    }
});
