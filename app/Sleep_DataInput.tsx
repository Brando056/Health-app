// Sleep Data Input Page
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
        "Try to fall asleep before 11 p.m. to ensure deep sleep.",
        "Avoid using electronic devices before bed, as blue light suppresses melatonin.",
        "Taking a warm bath or drinking warm milk before bed helps you relax.",
        "Keep the bedroom quiet, dark, and cool to improve sleep quality.",
        "Aim for 7–9 hours of continuous sleep to allow body recovery."
    ];

    const handleSubmit = async () => {
        if (!sleepHours || isNaN(parseFloat(sleepHours))) {
            alert('Please enter a valid sleep duration.');
            return;
        }

        try {
            const hours = parseFloat(sleepHours);
            const now = new Date();
            const today = now.toDateString();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();
            
            // Save sleep time
            await AsyncStorage.setItem('lastSleepTime', now.getTime().toString());
            await AsyncStorage.setItem('lastSleepHours', hours.toString());
            
            // Save sleep data with date for chart display – recorded as yesterday's sleep
            await AsyncStorage.setItem(`sleepHours_${yesterdayStr}`, hours.toString());
            
            router.back();
        } catch (error) {
            console.error('Failed to save sleep data:', error);
            alert('Save failed. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Record Sleep Duration</Text>
            
            <View style={styles.inputContainer}>
                <Text style={styles.label}>How long did you sleep last night (hours):</Text>
                <TextInput
                    style={styles.input}
                    value={sleepHours}
                    onChangeText={setSleepHours}
                    placeholder="e.g. 7.5"
                    keyboardType="numeric"
                />
            </View>
            
            <View style={styles.presetContainer}>
                <Text style={styles.presetLabel}>Quick Select:</Text>
                <View style={styles.presetButtons}>
                    <TouchableOpacity 
                        style={styles.presetButton}
                        onPress={() => setSleepHours('6')}
                    >
                        <Text style={styles.presetButtonText}>6 hours</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.presetButton}
                        onPress={() => setSleepHours('7')}
                    >
                        <Text style={styles.presetButtonText}>7 hours</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.presetButton}
                        onPress={() => setSleepHours('8')}
                    >
                        <Text style={styles.presetButtonText}>8 hours</Text>
                    </TouchableOpacity>
                </View>
            </View>
            
            <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
            >
                <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
            >
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            {/* Sleep tips section */}
            <View style={styles.tipsSection}>
                <Text style={styles.tipsTitle}>💤 Sleep Tips</Text>
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