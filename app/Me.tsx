import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Svg, { Circle } from 'react-native-svg';
import { ActivityIndicator } from 'react-native';
import { useRef } from 'react';

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
  const [addressInput, setAddressInput] = useState('');
  const [addressLatLng, setAddressLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<{ name: string; lat: number; lng: number; type: string; resolvedLat?: number; resolvedLng?: number }[]>([]);
  const ipIntervalRef = useRef<number | null>(null);

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

  // Setup location tracking
  useEffect(() => {
    let locationTask: Location.LocationSubscription;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Notice', 'Location permission denied, please enable manually');
        return;
      }
      locationTask = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30 * 1000,
          distanceInterval: 5,
        },
        (location) => {
          checkLocationProximity(location.coords.latitude, location.coords.longitude);
        }
      );
    })();
    return () => {
      if (locationTask) locationTask.remove();
    };
  }, [selectedLocations, sedentaryReminderMessage, drinkingReminderMessage, lastReminded]);

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
        const response = await fetch('http://192.168.1.101:5000/submit_health_data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            height: parseFloat(height),
            weight: parseFloat(weight),
          }),
        });

        const data = await response.json();
        if (data.message === 'Data submitted successfully') {
          // Save to AsyncStorage
          await AsyncStorage.setItem('height', height);
          await AsyncStorage.setItem('weight', weight);

          Alert.alert(
            'Success',
            'Height and weight saved successfully',
            [
              {
                text: 'OK',
                onPress: () => {
                  setHeight('');
                  setWeight('');
                },
              },
            ]
          );
        } else {
          Alert.alert('Notice', 'Data submission failed');
        }
      } catch (error) {
        console.error('Data submission failed:', error);
        Alert.alert('Notice', 'Data submission failed');
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
  const getLocationSuggestions = async (input: string) => {
    if (input.trim() === '') {
      setSuggestedLocations([]);
      setIsSuggestionsVisible(false);
      return;
    }
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
  };

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

  // Check if user is near a reminder location
  const checkLocationProximity = (userLat: number, userLng: number) => {
    const now = Date.now();
    selectedLocations.forEach((location) => {
      const distance = calculateDistance(userLat, userLng, location.lat, location.lng);
      const key = `${location.name}_${location.type}`;
      if (distance < 20 && (!lastReminded[key] || now - lastReminded[key] > 10 * 60 * 1000)) {
        let message = '';
        if (location.type === 'sedentary') {
          message = sedentaryReminderMessage;
          Alert.alert('Sedentary Reminder', message);
        } else if (location.type === 'drinking') {
          message = drinkingReminderMessage;
          Alert.alert('Hydration Reminder', message);
        }
        sendNotification(message);
        setLastReminded((prev) => ({ ...prev, [key]: now }));
      }
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

  // Get location by IP address
  const fetchIpLocation = async () => {
    setLoadingIpLocation(true);
    try {
      const response = await fetch(
        'https://apis.map.qq.com/ws/location/v1/ip?key=X5MBZ-4M7WU-RAWVF-GVCZL-ADAKQ-D2FWN'
      );
      const data = await response.json();
      if (data.status === 0) {
        setIpLocation(data.result);
      } else {
        Alert.alert('Location failed', data.message || 'Unknown error');
        setIpLocation(null);
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not get location info');
      setIpLocation(null);
    }
    setLoadingIpLocation(false);
  };

  // Periodic IP location check
  useEffect(() => {
    // Get on mount
    fetchIpLocation();
    // Get every 2 minutes
    ipIntervalRef.current = setInterval(() => {
      fetchIpLocation();
    }, 120000);

    // Cleanup on unmount
    return () => {
      if (ipIntervalRef.current) {
        clearInterval(ipIntervalRef.current);
      }
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

  // Check if user entered 50m range of address
  const checkAddressProximity = (userLat: number, userLng: number) => {
    if (addressLatLng) {
      const distance = calculateDistance(userLat, userLng, addressLatLng.lat, addressLatLng.lng);
      if (distance < 50) {
        Alert.alert('Reminder', 'You\'ve entered the 50m range of the set address');
      }
    }
  };

  // Location tracking for proximity detection
  useEffect(() => {
    let locationTask: Location.LocationSubscription;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Notice', 'Location permission denied, please enable manually');
        return;
      }
      locationTask = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30 * 1000,
          distanceInterval: 5,
        },
        (location) => {
          setCurrentCoords({lat: location.coords.latitude, lng: location.coords.longitude});
          checkAllLocationProximity(location.coords.latitude, location.coords.longitude);
        }
      );
    })();
    return () => {
      if (locationTask) locationTask.remove();
    };
  }, [selectedLocations, sedentaryReminderMessage, drinkingReminderMessage, lastReminded]);

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
      Alert.alert('Notice', 'Reminder location saved');

      // Immediately notify if user is in the area
      if (currentCoords) {
        checkAllLocationProximity(currentCoords.lat, currentCoords.lng);
      } else {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        checkAllLocationProximity(location.coords.latitude, location.coords.longitude);
      }
    }
  };

  // Check all locations for proximity
  const checkAllLocationProximity = (userLat: number, userLng: number) => {
    const now = Date.now();
    selectedLocations.forEach((location, idx) => {
      // Use resolved coordinates if available
      const targetLat = location.resolvedLat ?? location.lat;
      const targetLng = location.resolvedLng ?? location.lng;
      if (targetLat && targetLng) {
        const distance = calculateDistance(userLat, userLng, targetLat, targetLng);
        const key = `${location.name}_${location.type}`;
        if (distance < 50 && (!lastReminded[key] || now - lastReminded[key] > 10 * 60 * 1000)) {
          let message = '';
          if (location.type === 'sedentary') {
            message = sedentaryReminderMessage;
          } else if (location.type === 'drinking') {
            message = drinkingReminderMessage;
          } else {
            message = 'You are near a reminder location';
          }
          Alert.alert('Reminder', `${location.name}\n${message}`);
          sendNotification(message);
          setLastReminded((prev) => ({ ...prev, [key]: now }));
        }
      }
    });
  };

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
        <TextInput
          style={styles.input}
          value={reminderLocationInput}
          onChangeText={(text) => {
            setReminderLocationInput(text);
            getLocationSuggestions(text);
          }}
          placeholder="Enter location name"
        />
        {isSuggestionsVisible && (
          <View style={styles.suggestionsContainer}>
            {suggestedLocations.map((location, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => selectLocation(location)}
              >
                <Text>{location.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  suggestionsContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    marginTop: 8,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
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
});

export default Me;