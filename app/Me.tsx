import React, { useState, useEffect } from 'react';
import {
    Text,
    View,
    TextInput,
    Button,
    StyleSheet,
    Alert,
    FlatList,
    TouchableOpacity,
    ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const Me = () => {
    const router = useRouter();
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [reminderLocationInput, setReminderLocationInput] = useState('');
    const [checkInDays, setCheckInDays] = useState(0);
    const [selectedLocations, setSelectedLocations] = useState<{ name: string; lat: number; lng: number; type: string }[]>([]);
    const [suggestedLocations, setSuggestedLocations] = useState<any[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const TENCENT_MAP_API_KEY = 'X5MBZ-4M7WU-RAWVF-GVCZL-ADAKQ-D2FWN'; // 替换为你的腾讯地图 API Key

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
        };
        loadData();
    }, []);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('提示', '无法获取定位权限，请手动开启');
                return;
            }
            const locationTask = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 60 * 1000,
                    distanceInterval: 10
                },
                (location) => {
                    checkLocationProximity(location.coords.latitude, location.coords.longitude);
                }
            );
            return () => {
                locationTask.remove();
            };
        })();
    }, []);

    useEffect(() => {
        (async () => {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C'
                });
            }
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('提示', '无法获取通知权限，请手动开启');
            }
        })();
    }, []);

    const saveHeightWeight = async () => {
        if (height && weight) {
            try {
                const response = await fetch('http://192.168.1.101:5000/submit_health_data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        height: parseFloat(height),
                        weight: parseFloat(weight)
                    })
                });

                const data = await response.json();
                if (data.message === '数据提交成功') {
                    Alert.alert(
                        '成功',
                        '身高体重数据已成功保存',
                        [
                            {
                                text: '确定',
                                onPress: () => {
                                    setHeight('');
                                    setWeight('');
                                }
                            }
                        ]
                    );
                } else {
                    Alert.alert('提示', '数据提交失败');
                }
            } catch (error) {
                console.error('数据提交失败:', error);
                Alert.alert('提示', '数据提交失败');
            }
        } else {
            Alert.alert('提示', '请输入身高和体重');
        }
    };

    const handleCheckIn = async () => {
        const lastCheckInDate = await AsyncStorage.getItem('lastCheckInDate');
        const today = new Date().toDateString();
        if (lastCheckInDate === today) {
            Alert.alert('提示', '你今天已经打卡过了');
        } else {
            await AsyncStorage.setItem('lastCheckInDate', today);
            const newCheckInDays = checkInDays + 1;
            await AsyncStorage.setItem('checkInDays', newCheckInDays.toString());
            setCheckInDays(newCheckInDays);
            Alert.alert('提示', `你已经坚持打卡 ${newCheckInDays} 天`);
        }
    };

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
            console.error('获取地点建议失败:', error);
            setSuggestedLocations([]);
            setIsSuggestionsVisible(false);
        }
    };

    const selectLocation = async (location: any) => {
        setReminderLocationInput(location.title);
        setIsSuggestionsVisible(false);
        const locationType = await promptLocationType();
        if (locationType) {
            const newLocation = {
                name: location.title,
                lat: location.location.lat,
                lng: location.location.lng,
                type: locationType
            };
            const updatedLocations = [...selectedLocations, newLocation];
            setSelectedLocations(updatedLocations);
            await AsyncStorage.setItem('selectedLocations', JSON.stringify(updatedLocations));
            Alert.alert('提示', '提醒地点保存成功');
        }
    };

    const promptLocationType = () => {
        return new Promise<string | null>((resolve) => {
            Alert.alert(
                '选择提醒类型',
                '请选择该地点的提醒类型',
                [
                    {
                        text: '久坐提醒',
                        onPress: () => resolve('sedentary')
                    },
                    {
                        text: '饮水提醒',
                        onPress: () => resolve('drinking')
                    },
                    {
                        text: '取消',
                        onPress: () => resolve(null),
                        style: 'cancel'
                    }
                ],
                { cancelable: false }
            );
        });
    };

    const checkLocationProximity = (userLat: number, userLng: number) => {
        selectedLocations.forEach((location) => {
            const distance = calculateDistance(userLat, userLng, location.lat, location.lng);
            if (distance < 100) {
                let message = '';
                if (location.type === 'sedentary') {
                    message = '注意要多起身活动活动';
                } else if (location.type === 'drinking') {
                    message = '注意要多喝水';
                }
                sendNotification(message);
            }
        });
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // 地球半径，单位：米
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

    const sendNotification = async (message: string) => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '健康提醒',
                body: message,
                sound: 'default'
            },
            trigger: null
        });
    };

    const uploadLocationsToServer = async () => {
        try {
            const response = await fetch('http://192.168.1.101:5000/submit_locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locations: selectedLocations })
            });
            const data = await response.json();
            Alert.alert('提示', data.message);
        } catch (error) {
            console.error('上传失败:', error);
            Alert.alert('提示', '同步失败');
        }
    };

    const deleteLocation = async (index: number) => {
        const updated = [...selectedLocations];
        updated.splice(index, 1);
        setSelectedLocations(updated);
        await AsyncStorage.setItem('selectedLocations', JSON.stringify(updated));
        Alert.alert('提示', '提醒地点已删除');
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* 身高体重设置 */}
            <View style={styles.section}>
                <Text style={styles.label}>身高 (cm)</Text>
                <TextInput
                    value={height}
                    onChangeText={(text) => setHeight(text)}
                    placeholder="请输入身高"
                    keyboardType="numeric"
                    style={styles.input}
                />
                <Text style={styles.label}>体重 (kg)</Text>
                <TextInput
                    value={weight}
                    onChangeText={(text) => setWeight(text)}
                    placeholder="请输入体重"
                    keyboardType="numeric"
                    style={styles.input}
                />
                <Button title="保存身高体重" onPress={saveHeightWeight} />
            </View>

            {/* 提醒地点设置 */}
            <View style={styles.section}>
                <Text style={styles.label}>设置提醒地点</Text>
                <TextInput
                    value={reminderLocationInput}
                    onChangeText={(text) => {
                        setReminderLocationInput(text);
                        getLocationSuggestions(text);
                    }}
                    placeholder="请输入提醒地点"
                    style={styles.input}
                />
                {isSuggestionsVisible && (
                    <FlatList
                        data={suggestedLocations}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => selectLocation(item)}>
                                <Text style={styles.suggestionItem}>{item.title}</Text>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>

            {/* 已保存地点列表 */}
            {selectedLocations.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.label}>已保存的提醒地点</Text>
                    {selectedLocations.map((loc, index) => (
                        <View key={index} style={styles.locationItem}>
                            <Text>{loc.name}（{loc.type === 'sedentary' ? '久坐提醒' : '饮水提醒'}）</Text>
                            <TouchableOpacity onPress={() => deleteLocation(index)}>
                                <Text style={styles.deleteText}>删除</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {/* 打卡功能 */}
            <View style={styles.section}>
                <Button title="打卡" onPress={handleCheckIn} />
                <Text style={styles.checkInText}>你已经坚持打卡 {checkInDays} 天</Text>
            </View>

            {/* 同步提醒地点 */}
            <Button title="同步提醒地点到后端" onPress={uploadLocationsToServer} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    contentContainer: {
        padding: 16
    },
    section: {
        marginVertical: 16
    },
    label: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        padding: 8,
        marginBottom: 16
    },
    checkInText: {
        marginTop: 8,
        fontSize: 16
    },
    suggestionItem: {
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc'
    },
    locationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc'
    },
    deleteText: {
        color: 'red'
    }
});

export default Me;
