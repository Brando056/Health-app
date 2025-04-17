import React, { useState, useEffect } from 'react';
import { Text, View, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Health() {
    const router = useRouter();
    const [lastDrinkTime, setLastDrinkTime] = useState<number | null>(null);
    const [lastSleepTime, setLastSleepTime] = useState<number | null>(null);
    const [drinkAmount, setDrinkAmount] = useState(0);
    const [sleepHours, setSleepHours] = useState(0);

    useEffect(() => {
        const loadDrinkData = async () => {
            const lastDrink = await AsyncStorage.getItem('lastDrinkTime');
            const drinkAmountData = await AsyncStorage.getItem('dailyDrinkAmount');
            if (lastDrink) {
                setLastDrinkTime(parseFloat(lastDrink));
            }
            if (drinkAmountData) {
                setDrinkAmount(parseInt(drinkAmountData));
            }
        };

        const loadSleepData = async () => {
            const lastSleep = await AsyncStorage.getItem('lastSleepTime');
            const sleepHoursData = await AsyncStorage.getItem('lastSleepHours');
            if (lastSleep) {
                setLastSleepTime(parseFloat(lastSleep));
            }
            if (sleepHoursData) {
                setSleepHours(parseFloat(sleepHoursData));
            }
        };

        loadDrinkData();
        loadSleepData();

        // 每天0点清零数据
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const timeUntilMidnight = midnight.getTime() - now.getTime();

        const timer = setTimeout(async () => {
            await AsyncStorage.setItem('dailyDrinkAmount', '0');
            await AsyncStorage.setItem('lastSleepHours', '0');
            setDrinkAmount(0);
            setSleepHours(0);
        }, timeUntilMidnight);

        return () => clearTimeout(timer);
    }, []);

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

    return (
        <View style={styles.container}>
            {/* 饮水量模块 */}
            <TouchableOpacity
                style={styles.module}
                onPress={() => router.push({ pathname: "./Drink_DataInput" })}
            >
                <Text>今日已饮水{drinkAmount}ml  已有 {getTimeSinceLastDrink()} 分钟未喝水</Text>
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
                <Text>昨晚睡了 {sleepHours} 小时</Text>
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
            {/* 底部四个按钮 */}
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
        padding: 16
    },
    topLeftText: {
        position: 'absolute',
        top: 16,
        left: 16,
        fontSize: 24,
        fontWeight: 'bold',
        zIndex: 1
    },
    module: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 16,
        marginVertical: 8
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
        backgroundColor: 'green'
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
    bottomButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0
    }
});