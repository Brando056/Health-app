import React, { useState, useEffect } from 'react';
import { Text, View, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Health() {
    const router = useRouter();
    const [lastDrinkTime, setLastDrinkTime] = useState<number | null>(null);
    const [lastSleepTime, setLastSleepTime] = useState<number | null>(null);
    const [drinkCount, setDrinkCount] = useState(0);
    const [sleepHours, setSleepHours] = useState(0);

    useEffect(() => {
        const loadDrinkData = async () => {
            const lastDrink = await AsyncStorage.getItem('lastDrinkTime');
            const drinkCountData = await AsyncStorage.getItem('drinkCount');
            if (lastDrink) {
                setLastDrinkTime(parseFloat(lastDrink));
            }
            if (drinkCountData) {
                setDrinkCount(parseInt(drinkCountData));
            }
        };

        const loadSleepData = async () => {
            const lastSleep = await AsyncStorage.getItem('lastSleepTime');
            const sleepHoursData = await AsyncStorage.getItem('sleepHours');
            if (lastSleep) {
                setLastSleepTime(parseFloat(lastSleep));
            }
            if (sleepHoursData) {
                setSleepHours(parseFloat(sleepHoursData));
            }
        };

        loadDrinkData();
        loadSleepData();
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
        if (drinkCount < 2) return 0;
        if (drinkCount < 4) return 1;
        if (drinkCount < 6) return 2;
        if (drinkCount < 8) return 3;
        if (drinkCount < 10) return 4;
        return 9;
    };

    const getSleepBarIndex = () => {
        if (sleepHours < 4) return 0;
        if (sleepHours < 5) return 1;
        if (sleepHours < 6) return 2;
        if (sleepHours < 7) return 3;
        if (sleepHours < 8) return 4;
        return 9;
    };

    return (
        <View style={styles.container}>
            {/* 左上角的 Health 单词 */}
            <Text style={styles.topLeftText}>Health</Text>
            {/* 饮水量模块 */}
            <TouchableOpacity
                style={styles.module}
                onPress={() => router.push({ pathname: "./Drink_DataInput" })}
            >
                <Text>已有 {getTimeSinceLastDrink()} 分钟未喝水</Text>
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