import React, { useState } from 'react';
import {
    Text,
    View,
    StyleSheet,
    Button
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Sleep_DataInput() {
    const router = useRouter();
    const [sleepHours, setSleepHours] = useState<number>(0);

    const sleepTips = [
        "尽量在晚上11点前入睡，以保证充足的深度睡眠。",
        "睡前避免使用电子设备，因为屏幕发出的蓝光会抑制褪黑素的分泌。",
        "睡前可以泡个热水澡或喝一杯温牛奶，有助于放松身心。",
        "保持卧室安静、黑暗和凉爽的环境，有利于提高睡眠质量。",
        "最好一次睡眠时长在7 - 9小时，以满足身体的恢复需求。"
    ];

    const handleConfirm = async () => {
        await AsyncStorage.setItem('lastSleepHours', sleepHours.toString());
        await AsyncStorage.setItem('lastSleepTime', Date.now().toString());
        router.back();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>昨天睡了几个小时呢</Text>
            <Picker
                selectedValue={sleepHours}
                onValueChange={(itemValue) => setSleepHours(itemValue)}
                style={styles.picker}
            >
                {Array.from({ length: 13 }, (_, index) => (
                    <Picker.Item label={index.toString()} value={index} key={index} />
                ))}
            </Picker>
            <Button title="确认" onPress={handleConfirm} />
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
        padding: 16
    },
    label: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8
    },
    picker: {
        height: 150
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