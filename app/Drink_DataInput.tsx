import React, { useState, useEffect } from 'react';
import {
    Text,
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define image paths for each cup size
const cupImages: { [key: number]: any } = {
    50: require('../assets/images/cup_50ml.png'),
    100: require('../assets/images/cup_100ml.png'),
    150: require('../assets/images/cup_150ml.png'),
    200: require('../assets/images/cup_200ml.png'),
    300: require('../assets/images/cup_300ml.png')
};

// Common container references
const containerReferences = [
    { name: 'Small Teacup', volume: 150, image: require('../assets/images/cup_150ml.png') },
    { name: 'Regular Cup', volume: 250, image: require('../assets/images/cup_200ml.png') },
    { name: 'Large Bottle', volume: 500, image: require('../assets/images/cup_500ml.png') },
    { name: 'Sports Bottle', volume: 750, image: require('../assets/images/cup_750ml.png') }
];

export default function DrinkDataInput() {
    const router = useRouter();
    const [drinkAmount, setDrinkAmount] = useState('');
    const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [todayTotal, setTodayTotal] = useState('0');
    const [isClearing, setIsClearing] = useState(false);

    // Load today's total drinking amount
    useEffect(() => {
        loadTodayDrinkAmount();
    }, []);

    const loadTodayDrinkAmount = async () => {
        try {
            const today = new Date().toDateString();
            const amount = await AsyncStorage.getItem('dailyDrinkAmount') || '0';
            setTodayTotal(amount);
        } catch (error) {
            console.error('Failed to load drinking data:', error);
            showToast('Failed to load data');
        }
    };

    // Show alert message
    const showToast = (message: string) => {
        Alert.alert('Notice', message);
    };

    const handleSubmit = async () => {
        if (!drinkAmount || isNaN(parseInt(drinkAmount))) {
            Alert.alert('Notice', 'Please enter a valid drinking amount');
            return;
        }

        try {
            setIsSubmitting(true); // Start submitting, show loading indicator
            const amount = parseInt(drinkAmount);
            const now = new Date();
            const today = now.toDateString();

            // Save last drinking time
            await AsyncStorage.setItem('lastDrinkTime', now.getTime().toString());

            // Get and update today's drinking total
            const currentAmount = await AsyncStorage.getItem('dailyDrinkAmount') || '0';
            const newAmount = (parseInt(currentAmount) + amount).toString();
            await AsyncStorage.setItem('dailyDrinkAmount', newAmount);

            // Save dated drinking data for chart display
            await AsyncStorage.setItem(`dailyDrinkAmount_${today}`, newAmount);

            setIsSubmitting(false); // Reset loading state

            Alert.alert(
                'Saved Successfully',
                `Recorded ${amount}ml of water\nToday's total: ${newAmount}ml`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            console.error('Failed to save drinking data:', error);
            Alert.alert('Notice', 'Save failed, please try again');
            setIsSubmitting(false);
        }
    };

    const handleClearData = () => {
        if (todayTotal === '0') {
            showToast('No drinking data for today');
            return;
        }

        Alert.alert(
            'Confirm Deletion',
            'Are you sure you want to clear today\'s drinking records? This action is irreversible.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsClearing(true);
                            const today = new Date().toDateString();
                            await AsyncStorage.setItem('dailyDrinkAmount', '0');
                            await AsyncStorage.setItem(`dailyDrinkAmount_${today}`, '0');
                            setDrinkAmount('');
                            setSelectedContainer(null);
                            setTodayTotal('0');
                            setIsClearing(false);
                            showToast('Today\'s drinking records have been cleared');
                        } catch (error) {
                            console.error('Failed to clear data:', error);
                            Alert.alert('Notice', 'Clear failed, please try again');
                            setIsClearing(false);
                        }
                    }
                }
            ]
        );
    };

    const handleNavigateBack = () => {
        try {
            router.back();
            setTimeout(() => {
                router.push('./Health');
            }, 100);
        } catch (error) {
            console.error('Navigation failed:', error);
            router.push('./Health');
        }
    };

    const selectContainer = (volume: number) => {
        setDrinkAmount(volume.toString());
        setSelectedContainer(volume);
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Log Water Intake</Text>

            {/* Display today's total water intake */}
            <View style={styles.todayTotalContainer}>
                <Text style={styles.todayTotalLabel}>Water consumed today</Text>
                <Text style={styles.todayTotalValue}>{todayTotal} ml</Text>
            </View>

            {/* Container selection */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Choose Container</Text>
                <Text style={styles.sectionDescription}>Select the container you used to quickly log the intake</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.containerScroll}>
                    {containerReferences.map((container, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.containerItem,
                                selectedContainer === container.volume && styles.selectedContainerItem
                            ]}
                            onPress={() => selectContainer(container.volume)}
                        >
                            <Image source={container.image} style={styles.containerImage} />
                            <Text style={styles.containerName}>{container.name}</Text>
                            <Text style={styles.containerVolume}>{container.volume}ml</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Custom input */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Custom Amount (ml)</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={drinkAmount}
                        onChangeText={setDrinkAmount}
                        placeholder="Enter amount"
                        keyboardType="numeric"
                    />
                    <Text style={styles.unitText}>ml</Text>
                </View>
            </View>

            {/* Quick selection */}
            <View style={styles.presetContainer}>
                <Text style={styles.sectionTitle}>Quick Select</Text>
                <View style={styles.presetButtons}>
                    <TouchableOpacity
                        style={styles.presetButton}
                        onPress={() => setDrinkAmount('200')}
                    >
                        <Text style={styles.presetButtonText}>200ml</Text>
                        <Text style={styles.presetDescription}>Small glass</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.presetButton}
                        onPress={() => setDrinkAmount('350')}
                    >
                        <Text style={styles.presetButtonText}>350ml</Text>
                        <Text style={styles.presetDescription}>Medium glass</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.presetButton}
                        onPress={() => setDrinkAmount('500')}
                    >
                        <Text style={styles.presetButtonText}>500ml</Text>
                        <Text style={styles.presetDescription}>Bottle water</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Reference info */}
            <View style={styles.referenceContainer}>
                <Text style={styles.referenceTitle}>Reference</Text>
                <Text style={styles.referenceText}>• Recommended daily intake for adults: 1500-2000ml</Text>
                <Text style={styles.referenceText}>• Typical bottled water: 500-550ml</Text>
                <Text style={styles.referenceText}>• Regular mug: 250-300ml</Text>
                <Text style={styles.referenceText}>• Small teacup: 150-200ml</Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (!drinkAmount || isSubmitting) && styles.disabledButton
                    ]}
                    onPress={handleSubmit}
                    disabled={!drinkAmount || isSubmitting}
                    activeOpacity={0.7}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.submitButtonText}>Submit</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleNavigateBack}
                    disabled={isSubmitting || isClearing}
                    activeOpacity={0.7}
                >
                    <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
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
        marginBottom: 20,
        textAlign: 'center'
    },
    sectionContainer: {
        marginBottom: 25
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333'
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10
    },
    containerScroll: {
        flexDirection: 'row',
        marginTop: 10
    },
    containerItem: {
        alignItems: 'center',
        marginRight: 20,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        width: 100
    },
    selectedContainerItem: {
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)'
    },
    containerImage: {
        width: 50,
        height: 70,
        resizeMode: 'contain'
    },
    containerName: {
        marginTop: 5,
        fontSize: 14,
        fontWeight: 'bold'
    },
    containerVolume: {
        fontSize: 12,
        color: '#666'
    },
    inputContainer: {
        marginBottom: 25
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    label: {
        fontSize: 18,
        marginBottom: 10
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        fontSize: 16
    },
    unitText: {
        fontSize: 16,
        marginLeft: 10,
        fontWeight: 'bold'
    },
    presetContainer: {
        marginBottom: 25
    },
    presetButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10
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
    presetDescription: {
        fontSize: 12,
        color: '#666',
        marginTop: 4
    },
    referenceContainer: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 10,
        marginBottom: 25
    },
    referenceTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8
    },
    referenceText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 5
    },
    todayTotalContainer: {
        alignItems: 'center',
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#f0f8ff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#b3e5fc'
    },
    todayTotalLabel: {
        fontSize: 16,
        color: '#555',
        marginBottom: 5
    },
    todayTotalValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0288d1'
    },
    buttonContainer: {
        marginTop: 10,
        marginBottom: 30
    },
    submitButton: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2
    },
    disabledButton: {
        backgroundColor: '#a5d6a7',
        opacity: 0.7
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    clearButton: {
        backgroundColor: '#f44336',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2
    },
    clearButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1
    },
    cancelButtonText: {
        color: '#333',
        fontSize: 16
    }
});