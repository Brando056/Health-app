import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Text,
    View,
    StyleSheet,
    ScrollView,
    TextInput,
    Alert,
    TouchableOpacity,
    FlatList,
    Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Svg, { Circle } from 'react-native-svg';
import { ActivityIndicator } from 'react-native';

const CIRCLE_RADIUS = 100;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// Predefined sedentary reminder messages
const SEDENTARY_PRESET_MESSAGES = [
  'Prolonged sitting is unhealthy, get up and move!',
  'Sitting too long causes fatigue, stretch your muscles!',
  'Remember to move regularly, sitting increases health risks!',
  'Get up for 5 minutes every hour for a healthier lifestyle!',
];

// Predefined drinking reminder messages
const DRINKING_PRESET_MESSAGES = [
  'Remember to drink water, stay hydrated!',
  'Time for water! 8 glasses a day keeps you healthy!',
  'Proper hydration improves work efficiency!',
  'Don\'t forget to hydrate, your body needs water!',
];

const Me = () => {
    const router = useRouter();
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [reminderLocationInput, setReminderLocationInput] = useState('');
    const [checkInDays, setCheckInDays] = useState(0);
    const [suggestedLocations, setSuggestedLocations] = useState<any[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const TENCENT_MAP_API_KEY = 'X5MBZ-4M7WU-RAWVF-GVCZL-ADAKQ-D2FWN'; // Your Tencent Map API Key
    const [sedentaryReminderMessage, setSedentaryReminderMessage] = useState('Remember to get up and move');
    const [drinkingReminderMessage, setDrinkingReminderMessage] = useState('Remember to drink water');
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState('');
    const [showSedentaryPresets, setShowSedentaryPresets] = useState(false);
    const [showDrinkingPresets, setShowDrinkingPresets] = useState(false);
    const [lastReminded, setLastReminded] = useState<{ [key: string]: number }>({});
    const [ipLocation, setIpLocation] = useState<any>(null);
    const [loadingIpLocation, setLoadingIpLocation] = useState(false);
    const [selectedLocations, setSelectedLocations] = useState<{ name: string; lat: number; lng: number; type: string; resolvedLat?: number; resolvedLng?: number }[]>([]);
    const ipIntervalRef = useRef<number | null>(null);
    const [ipLatLng, setIpLatLng] = useState<{ lat: number; lng: number } | null>(null);
    const debounceTimer = useRef<number | null>(null);
    const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
    const [reminderModalContent, setReminderModalContent] = useState({ title: '', message: '' });

    // Load saved data on component mount
    useEffect(() => {
        const loadData = async () => {
            const days = await AsyncStorage.getItem('checkInDays');
            if (days) {
                setCheckInDays(parseInt(days));
            }
            const locations = await AsyncStorage.getItem('selectedLocations');
            if (locations) {
                setSelectedLocations(JSON.parse(locations));
            }
            const lastCheckInDate = await AsyncStorage.getItem('lastCheckInDate');
            const today = new Date().toDateString();
            if (lastCheckInDate === today) {
                setIsCheckedIn(true);
                const checkInTimeStr = await AsyncStorage.getItem('checkInTime');
                if (checkInTimeStr) {
                    setCheckInTime(checkInTimeStr);
                }
            }
        };
        loadData();
    }, []);

    // Setup notifications
    useEffect(() => {
        (async () => {
            // Configure Android notification channel
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
                });

            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Notice', 'Notification permission denied, please enable manually');
            }
        })();
    }, []);

    // Save height and weight data
    const saveHeightWeight = async () => {
        if (height && weight) {
            try {
                // 只保留本地保存到 AsyncStorage 的逻辑
                await AsyncStorage.setItem('height', height);
                await AsyncStorage.setItem('weight', weight);

                Alert.alert(
                    'Success',
                    'Height and weight saved successfully',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // 清空输入框
                                setHeight('');
                                setWeight('');
                            },
                        },
                    ]
                );
            } catch (error) {
                console.error('Failed to save height and weight locally:', error);
                Alert.alert('Notice', 'Failed to save height and weight locally, please try again.');
            }
        } else {
            Alert.alert('Notice', 'Please enter both height and weight');
        }
    };

    // Handle daily check-in
    const handleCheckIn = async () => {
        const lastCheckInDate = await AsyncStorage.getItem('lastCheckInDate');
        const today = new Date().toDateString();
        if (lastCheckInDate === today) {
            Alert.alert('Notice', 'You already checked in today');
        } else {
            const now = new Date();
            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            await AsyncStorage.setItem('lastCheckInDate', today);
            await AsyncStorage.setItem('checkInTime', timeString);
            const newCheckInDays = checkInDays + 1;
            await AsyncStorage.setItem('checkInDays', newCheckInDays.toString());
            setCheckInDays(newCheckInDays);
            setIsCheckedIn(true);
            setCheckInTime(timeString);
            Alert.alert('Notice', `You've checked in ${newCheckInDays} days in a row!`);
        }
    };

    // Get location suggestions based on input
    const getLocationSuggestions = useCallback(async (input: string) => {
        if (input.trim() === '') {
            setSuggestedLocations([]);
            setIsSuggestionsVisible(false);
            return;
        }

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        
        debounceTimer.current = setTimeout(async () => {
        try {
            const response = await fetch(
                `https://apis.map.qq.com/ws/place/v1/suggestion/?keyword=${encodeURIComponent(input)}&key=${TENCENT_MAP_API_KEY}`
            );
            const data = await response.json();
            if (data.status === 0) {
                setSuggestedLocations(data.data);
                setIsSuggestionsVisible(true);
            } else {
                setSuggestedLocations([]);
                setIsSuggestionsVisible(false);
            }
        } catch (error) {
                console.error('Failed to get location suggestions:', error);
            setSuggestedLocations([]);
            setIsSuggestionsVisible(false);
        }
        }, 300);
    }, [TENCENT_MAP_API_KEY]);

    // Prompt user to select reminder type for a location
    const promptLocationType = () => {
        return new Promise<string | null>((resolve) => {
            Alert.alert(
                'Select Reminder Type',
                'Choose reminder type for this location',
                [
                    {
                        text: 'Sedentary Reminder',
                        onPress: () => resolve('sedentary'),
                    },
                    {
                        text: 'Hydration Reminder',
                        onPress: () => resolve('drinking'),
                    },
                    {
                        text: 'Cancel',
                        onPress: () => resolve(null),
                        style: 'cancel',
                    },
                ],
                { cancelable: false }
            );
        });
    };

    // Calculate distance between two points
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    // Send notification
    const sendNotification = async (message: string) => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Health Reminder',
                body: message,
                sound: 'default',
            },
            trigger: null,
        });
    };

    // Delete location reminder
    const deleteLocation = async (index: number) => {
        const updated = [...selectedLocations];
        updated.splice(index, 1);
        setSelectedLocations(updated);
        await AsyncStorage.setItem('selectedLocations', JSON.stringify(updated));
        Alert.alert('Notice', 'Reminder location deleted');
    };

    // Bottom navigation bar
    const renderNavigation = () => (
        <View style={styles.navigationContainer}>
            {['Health', 'Sport', 'Chart', 'Me'].map((page) => (
                <TouchableOpacity
                    key={page}
                    style={[
                        styles.navButton,
                        page === 'Me' && styles.activeButton
                    ]}
                    onPress={() => router.push(`./${page}`)}
                >
                    <Text style={styles.buttonText}>{page}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    // Check all locations for proximity (modified to use ipLatLng state directly)
    const checkAllLocationProximity = useCallback(() => {
        if (!ipLatLng) {
            console.log('Me: No IP location available for proximity check.');
            return;
        }
        const userLat = ipLatLng.lat;
        const userLng = ipLatLng.lng;

        const now = Date.now();
        selectedLocations.forEach((location) => {
            if (location.type === 'unset') return;

            const distance = calculateDistance(userLat, userLng, location.lat, location.lng);
            const key = `${location.name}_${location.type}`;
            if (distance < 50 && (!lastReminded[key] || now - lastReminded[key] > 10 * 60 * 1000)) {
                let message = '';
                let title = '';
                if (location.type === 'sedentary') {
                    title = '久坐提醒';
                    message = sedentaryReminderMessage;
                } else if (location.type === 'drinking') {
                    title = '饮水提醒';
                    message = drinkingReminderMessage;
                }
                
                if (title && message) {
                    showReminderModal(title, message);
                    sendNotification(message);
                    setLastReminded((prev) => ({ ...prev, [key]: now }));
                }
            }
        });
    }, [ipLatLng, selectedLocations, sedentaryReminderMessage, drinkingReminderMessage, lastReminded]);

    // Periodic IP location check (main useEffect for IP location logic)
    useEffect(() => {
        let isMounted = true;

        const initializeLocation = async () => {
            try {
                // 先尝试从 AsyncStorage 加载保存的位置
                const savedLat = await AsyncStorage.getItem('ip_latitude');
                const savedLng = await AsyncStorage.getItem('ip_longitude');
                
                if (savedLat && savedLng && isMounted) {
                    setIpLatLng({ lat: parseFloat(savedLat), lng: parseFloat(savedLng) });
                }

                // 然后获取新的位置信息
                const response = await fetch(
                    'https://apis.map.qq.com/ws/location/v1/ip?key=' + TENCENT_MAP_API_KEY
                );
                const data = await response.json();
                
                if (isMounted && data.status === 0 && data.result && data.result.location) {
                    const { lat, lng } = data.result.location;
                    setIpLocation(data.result);
                    setIpLatLng({ lat, lng });
                    await AsyncStorage.setItem('ip_latitude', lat.toString());
                    await AsyncStorage.setItem('ip_longitude', lng.toString());
                    checkAllLocationProximity();
                }
            } catch (error) {
                console.error('Failed to initialize location:', error);
            }
        };

        initializeLocation();

        const timer = setInterval(() => {
            if (isMounted) {
                initializeLocation();
            }
        }, 120000);

        return () => {
            isMounted = false;
            clearInterval(timer);
        };
    }, []);

    // Convert address to coordinates
    const fetchLatLngByAddress = async (address: string) => {
        const key = 'X5MBZ-4M7WU-RAWVF-GVCZL-ADAKQ-D2FWN';
        const url = `https://apis.map.qq.com/ws/geocoder/v1/?address=${encodeURIComponent(address)}&key=${key}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.status === 0) {
                return data.result.location;
            } else {
                return null;
            }
        } catch (e) {
            return null;
        }
    };

    // Add location reminder with automatic coordinates
    const selectLocation = async (location: any) => {
        setReminderLocationInput(location.title);
        setIsSuggestionsVisible(false);
        const locationType = await promptLocationType();
        if (locationType) {
            // Get coordinates for the location
            const resolved = await fetchLatLngByAddress(location.title);
            const newLocation = {
                name: location.title,
                lat: location.location.lat,
                lng: location.location.lng,
                type: locationType,
                resolvedLat: resolved ? resolved.lat : null,
                resolvedLng: resolved ? resolved.lng : null,
            };
            const updatedLocations = [...selectedLocations, newLocation];
            setSelectedLocations(updatedLocations);
            await AsyncStorage.setItem('selectedLocations', JSON.stringify(updatedLocations));

            // 先显示保存成功的提示
            Alert.alert('Success', 'Reminder location saved', [
                {
                    text: 'OK',
                    onPress: () => {
                        // 在用户确认保存成功后，再检查位置并显示提醒
                        setTimeout(() => {
                            checkAllLocationProximity();
                        }, 500); // 添加短暂延迟确保第一个提示完全消失
                    }
                }
            ]);
        }
    };

    // Location input change handler
    const handleLocationInputChange = useCallback((text: string) => {
        setReminderLocationInput(text);
        
        if (text.trim() === '') {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
                debounceTimer.current = null;
            }
            setSuggestedLocations([]);
            setIsSuggestionsVisible(false);
            return;
        }
        
        getLocationSuggestions(text);
    }, [getLocationSuggestions]);

    const showReminderModal = (title: string, message: string) => {
        setReminderModalContent({ title, message });
        setIsReminderModalVisible(true);
    };

    const renderReminderModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isReminderModalVisible}
            onRequestClose={() => setIsReminderModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{reminderModalContent.title}</Text>
                    <Text style={styles.modalMessage}>{reminderModalContent.message}</Text>
                    <TouchableOpacity
                        style={styles.modalButton}
                        onPress={() => setIsReminderModalVisible(false)}
                    >
                        <Text style={styles.modalButtonText}>好的</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Height and weight input */}
            <View style={styles.section}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                    style={styles.input}
                    value={height}
                    onChangeText={setHeight}
                    placeholder="Enter height"
                    keyboardType="numeric"
                />
            </View>
            <View style={styles.section}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                    style={styles.input}
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="Enter weight"
                    keyboardType="numeric"
                />
            </View>
            <TouchableOpacity style={styles.button} onPress={saveHeightWeight}>
                <Text style={styles.buttonText}>Save Height & Weight</Text>
            </TouchableOpacity>

            {/* IP-based location */}
            <View style={styles.section}>
                <Text style={styles.label}>IP-Based Location (City Level)</Text>
                {loadingIpLocation && <ActivityIndicator size="small" color="#4CAF50" />}
                {ipLocation && (
                    <View style={{ marginTop: 10 }}>
                        <Text>IP: {ipLocation.ip}</Text>
                        <Text>Longitude: {ipLocation.location.lng}</Text>
                        <Text>Latitude: {ipLocation.location.lat}</Text>
                        <Text>Province: {ipLocation.ad_info.province}</Text>
                        <Text>City: {ipLocation.ad_info.city}</Text>
                        <Text>District: {ipLocation.ad_info.district}</Text>
                    </View>
                )}
            </View>

            {/* Reminder location setup */}
            <View style={styles.section}>
                <Text style={styles.label}>Set Reminder Location</Text>
                <View style={styles.inputContainer}>
                <TextInput
                        style={styles.input}
                    value={reminderLocationInput}
                        onChangeText={handleLocationInputChange}
                        placeholder="Enter location name"
                />
                {isSuggestionsVisible && (
                        <View style={styles.suggestionsContainer}>
                            {suggestedLocations.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.suggestionItem}
                                    onPress={() => selectLocation(item)}
                                >
                                    <Text>{item.title}</Text>
                            </TouchableOpacity>
                            ))}
                        </View>
                )}
                </View>
            </View>

            {/* Saved reminder locations */}
                <View style={styles.section}>
                <Text style={styles.label}>Saved Reminder Locations</Text>
                {selectedLocations.map((location, index) => (
                        <View key={index} style={styles.locationItem}>
                        <View>
                            <Text>{location.name} - {location.type === 'sedentary' ? 'Sedentary' : 'Hydration'}</Text>
                            <Text style={{fontSize: 12, color: '#888'}}>
                                Coordinates: {location.resolvedLat ?? location.lat}, {location.resolvedLng ?? location.lng}
                            </Text>
                        </View>
                            <TouchableOpacity onPress={() => deleteLocation(index)}>
                            <Text style={styles.deleteButton}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
            </View>

            {/* Sedentary reminder customization */}
            <View style={styles.section}>
                <Text style={styles.label}>Sedentary Reminder</Text>
                <TextInput
                    style={styles.input}
                    value={sedentaryReminderMessage}
                    onChangeText={setSedentaryReminderMessage}
                    placeholder="Enter sedentary reminder message"
                    onFocus={() => {
                        setShowSedentaryPresets(true);
                        setShowDrinkingPresets(false);
                    }}
                />
                {showSedentaryPresets && (
                    <View style={styles.presetContainer}>
                        <FlatList
                            data={SEDENTARY_PRESET_MESSAGES}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.presetItem}
                                    onPress={() => {
                                        setSedentaryReminderMessage(item);
                                        setShowSedentaryPresets(false);
                                    }}
                                >
                                    <Text>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                </View>
            )}
            </View>

            {/* Hydration reminder customization */}
            <View style={styles.section}>
                <Text style={styles.label}>Hydration Reminder</Text>
                <TextInput
                    style={styles.input}
                    value={drinkingReminderMessage}
                    onChangeText={setDrinkingReminderMessage}
                    placeholder="Enter hydration reminder message"
                    onFocus={() => {
                        setShowDrinkingPresets(true);
                        setShowSedentaryPresets(false);
                    }}
                />
                {showDrinkingPresets && (
                    <View style={styles.presetContainer}>
                        <FlatList
                            data={DRINKING_PRESET_MESSAGES}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.presetItem}
                                    onPress={() => {
                                        setDrinkingReminderMessage(item);
                                        setShowDrinkingPresets(false);
                                    }}
                                >
                                    <Text>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}
            </View>

            {/* Check-in circle */}
            <View style={styles.checkInContainer}>
                <Svg width={CIRCLE_RADIUS * 2 + 20} height={CIRCLE_RADIUS * 2 + 20}>
                    {/* Background circle */}
                    <Circle
                        cx={CIRCLE_RADIUS + 10}
                        cy={CIRCLE_RADIUS + 10}
                        r={CIRCLE_RADIUS}
                        stroke="#e0e0e0"
                        strokeWidth={10}
                        fill="none"
                    />
                    {/* Progress circle */}
                    <Circle
                        cx={CIRCLE_RADIUS + 10}
                        cy={CIRCLE_RADIUS + 10}
                        r={CIRCLE_RADIUS}
                        stroke={isCheckedIn ? '#4CAF50' : '#999'}
                        strokeWidth={10}
                        fill="none"
                        strokeDasharray={CIRCLE_CIRCUMFERENCE}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                    />
                </Svg>
                <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
                    <Text style={styles.checkInText}>
                        {isCheckedIn ? `Checked In\nTime: ${checkInTime}\nDays: ${checkInDays}` : 'Check In'}
                    </Text>
                </TouchableOpacity>
        </View>

            {/* Bottom navigation */}
            {renderNavigation()}

            {renderReminderModal()}
        </ScrollView>
    );
};

const NAVIGATION_HEIGHT = 50; // Navigation bar height

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: NAVIGATION_HEIGHT, // Padding for navigation
    },
    section: {
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 20,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#4CAF50',
        padding: 14,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    checkInDaysText: {
        fontSize: 16,
        marginBottom: 16,
    },
    inputContainer: {
        position: 'relative',
        zIndex: 1,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginTop: 4,
        maxHeight: 200,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 1000,
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    locationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    deleteButton: {
        color: 'red',
    },
    checkInContainer: {
        alignItems: 'center',
        marginTop: 32,
    },
    checkInButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -CIRCLE_RADIUS - 10 }, { translateY: -CIRCLE_RADIUS - 10 }],
        width: CIRCLE_RADIUS * 2 + 20,
        height: CIRCLE_RADIUS * 2 + 20,
        borderRadius: CIRCLE_RADIUS + 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkInText: {
        textAlign: 'center',
        fontSize: 16,
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
    presetContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 12,
        marginTop: 8,
        maxHeight: 150,
    },
    presetItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 20,
        width: '80%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 16,
        marginBottom: 20,
    },
    modalButton: {
        backgroundColor: '#4CAF50',
        padding: 14,
        borderRadius: 20,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: 'white',
    },
});

export default Me;