import React, { useState } from 'react';
import {
    Text,
    View,
    StyleSheet,
    Button,
    TouchableOpacity,
    TextInput
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SleepDataInput() {
    const router = useRouter();
    const [sleepHours, setSleepHours] = useState('');

    const sleepTips = [
        "尽量在晚上11点前入睡，以保证充足的深度睡眠。",
        "睡前避免使用电子设备，因为屏幕发出的蓝光会抑制褪黑素的分泌。",
        "睡前可以泡个热水澡或喝一杯温牛奶，有助于放松身心。",
        "保持卧室安静、黑暗和凉爽的环境，有利于提高睡眠质量。",
        "最好一次睡眠时长在7 - 9小时，以满足身体的恢复需求。"
    ];

    const handleSubmit = async () => {
        if (!sleepHours || isNaN(parseFloat(sleepHours))) {
            alert('请输入有效的睡眠时间');
            return;
        }

        try {
            const hours = parseFloat(sleepHours);
            const now = new Date();
            const today = now.toDateString();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();
            
            // 保存睡眠时间
            await AsyncStorage.setItem('lastSleepTime', now.getTime().toString());
            await AsyncStorage.setItem('lastSleepHours', hours.toString());
            
            // 保存带日期的睡眠数据用于图表显示 - 记录为昨天的睡眠
            await AsyncStorage.setItem(`sleepHours_${yesterdayStr}`, hours.toString());
            
            router.back();
        } catch (error) {
            console.error('保存睡眠数据失败:', error);
            alert('保存失败，请重试');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>记录睡眠时间</Text>
            
            <View style={styles.inputContainer}>
                <Text style={styles.label}>昨晚睡了多久 (小时):</Text>
                <TextInput
                    style={styles.input}
                    value={sleepHours}
                    onChangeText={setSleepHours}
                    placeholder="例如: 7.5"
                    keyboardType="numeric"
                />
            </View>
            
            <View style={styles.presetContainer}>
                <Text style={styles.presetLabel}>快速选择:</Text>
                <View style={styles.presetButtons}>
                    <TouchableOpacity 
                        style={styles.presetButton}
                        onPress={() => setSleepHours('6')}
                    >
                        <Text style={styles.presetButtonText}>6小时</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.presetButton}
                        onPress={() => setSleepHours('7')}
                    >
                        <Text style={styles.presetButtonText}>7小时</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.presetButton}
                        onPress={() => setSleepHours('8')}
                    >
                        <Text style={styles.presetButtonText}>8小时</Text>
                    </TouchableOpacity>
                </View>
            </View>
            
            <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
            >
                <Text style={styles.submitButtonText}>提交</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
            >
                <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            
            {/* 睡眠小提示部分 */}
            <View style={styles.tipsSection}>
                <Text style={styles.tipsTitle}>💤 睡眠小贴士</Text>
                {sleepTips.map((tip, index) => (
                    <Text key={index} style={styles.tipText}>
                        {index + 1}. {tip}
                    </Text>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center'
    },
    inputContainer: {
        marginBottom: 30
    },
    label: {
        fontSize: 18,
        marginBottom: 10
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        fontSize: 16
    },
    presetContainer: {
        marginBottom: 30
    },
    presetLabel: {
        fontSize: 18,
        marginBottom: 10
    },
    presetButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    presetButton: {
        backgroundColor: '#e0e0e0',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center'
    },
    presetButtonText: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    submitButton: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center'
    },
    cancelButtonText: {
        color: '#333',
        fontSize: 18
    },
    tipsSection: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginTop: 20
    },
    tipsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 8
    },
    tipText: {
        marginBottom: 8
    }
});