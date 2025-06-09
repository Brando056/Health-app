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

// 预设的久坐提醒语句
const SEDENTARY_PRESET_MESSAGES = [
  '长时间坐着不利于健康，起来活动一下吧！',
  '久坐易疲劳，起身舒展一下筋骨吧！',
  '别忘了定时活动，久坐会增加健康风险哦！',
  '每小时起身活动5分钟，健康生活从点滴开始！',
];

// 预设的饮水提醒语句
const DRINKING_PRESET_MESSAGES = [
  '记得喝水哦，保持身体水分平衡！',
  '喝水时间到，每天8杯水，健康常相随！',
  '适当饮水有助于提高工作效率！',
  '别忘记补水，你的身体需要水分！',
];

const Me = () => {
  const router = useRouter();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [reminderLocationInput, setReminderLocationInput] = useState('');
  const [checkInDays, setCheckInDays] = useState(0);
  const [suggestedLocations, setSuggestedLocations] = useState<any[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const TENCENT_MAP_API_KEY = 'X5MBZ-4M7WU-RAWVF-GVCZL-ADAKQ-D2FWN'; // 替换为你的腾讯地图 API Key
  const [sedentaryReminderMessage, setSedentaryReminderMessage] = useState('注意要多起身活动活动');
  const [drinkingReminderMessage, setDrinkingReminderMessage] = useState('注意要多喝水');
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

  useEffect(() => {
    let locationTask: Location.LocationSubscription;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '无法获取定位权限，请手动开启');
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

  useEffect(() => {
    (async () => {
      // 默认配置安卓通知通道，移除Platform检查
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      
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
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            height: parseFloat(height),
            weight: parseFloat(weight),
          }),
        });

        const data = await response.json();
        if (data.message === '数据提交成功') {
          // 保存到 AsyncStorage
          await AsyncStorage.setItem('height', height);
          await AsyncStorage.setItem('weight', weight);

          Alert.alert(
            '成功',
            '身高体重数据已成功保存',
            [
              {
                text: '确定',
                onPress: () => {
                  setHeight('');
                  setWeight('');
                },
              },
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
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      await AsyncStorage.setItem('lastCheckInDate', today);
      await AsyncStorage.setItem('checkInTime', timeString);
      const newCheckInDays = checkInDays + 1;
      await AsyncStorage.setItem('checkInDays', newCheckInDays.toString());
      setCheckInDays(newCheckInDays);
      setIsCheckedIn(true);
      setCheckInTime(timeString);
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

  const promptLocationType = () => {
    return new Promise<string | null>((resolve) => {
      Alert.alert(
        '选择提醒类型',
        '请选择该地点的提醒类型',
        [
          {
            text: '久坐提醒',
            onPress: () => resolve('sedentary'),
          },
          {
            text: '饮水提醒',
            onPress: () => resolve('drinking'),
          },
          {
            text: '取消',
            onPress: () => resolve(null),
            style: 'cancel',
          },
        ],
        { cancelable: false }
      );
    });
  };

  const checkLocationProximity = (userLat: number, userLng: number) => {
    const now = Date.now();
    selectedLocations.forEach((location) => {
      const distance = calculateDistance(userLat, userLng, location.lat, location.lng);
      const key = `${location.name}_${location.type}`;
      if (distance < 20 && (!lastReminded[key] || now - lastReminded[key] > 10 * 60 * 1000)) {
        let message = '';
        if (location.type === 'sedentary') {
          message = sedentaryReminderMessage;
          Alert.alert('久坐提醒', message);
        } else if (location.type === 'drinking') {
          message = drinkingReminderMessage;
          Alert.alert('饮水提醒', message);
        }
        sendNotification(message);
        setLastReminded((prev) => ({ ...prev, [key]: now }));
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
        sound: 'default',
      },
      trigger: null,
    });
  };

  const deleteLocation = async (index: number) => {
    const updated = [...selectedLocations];
    updated.splice(index, 1);
    setSelectedLocations(updated);
    await AsyncStorage.setItem('selectedLocations', JSON.stringify(updated));
    Alert.alert('提示', '提醒地点已删除');
  };

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
        Alert.alert('定位失败', data.message || '未知错误');
        setIpLocation(null);
      }
    } catch (error) {
      Alert.alert('网络错误', '无法获取定位信息');
      setIpLocation(null);
    }
    setLoadingIpLocation(false);
  };

  // 自动定时获取IP定位
    useEffect(() => {
      // 组件挂载时立即获取一次
      fetchIpLocation();
      // 每120秒自动获取一次
      ipIntervalRef.current = setInterval(() => {
        fetchIpLocation();
      }, 120000); // 修改为120秒

      // 卸载时清理定时器
      return () => {
        if (ipIntervalRef.current) {
          clearInterval(ipIntervalRef.current);
        }
      };
    }, []);

  // 地址转经纬度（用于提醒地点）
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

  // 判断当前位置是否进入50米范围
  const checkAddressProximity = (userLat: number, userLng: number) => {
    if (addressLatLng) {
      const distance = calculateDistance(userLat, userLng, addressLatLng.lat, addressLatLng.lng);
      if (distance < 50) {
        Alert.alert('提醒', '你已进入设定地址的50米范围内');
      }
    }
  };

  // 监听定位，实时更新
  useEffect(() => {
    let locationTask: Location.LocationSubscription;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '无法获取定位权限，请手动开启');
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

  // 新增：添加提醒地点时自动解析经纬度
const selectLocation = async (location: any) => {
  setReminderLocationInput(location.title);
  setIsSuggestionsVisible(false);
  const locationType = await promptLocationType();
  if (locationType) {
    // 解析经纬度
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
    Alert.alert('提示', '提醒地点保存成功');

    // 新增逻辑：如果用户当前在提醒地点范围内，立即弹出一次提醒
    if (currentCoords) {
      checkAllLocationProximity(currentCoords.lat, currentCoords.lng);
    }
  }
};

// 检查所有提醒地点，进入50米范围弹窗
const checkAllLocationProximity = (userLat: number, userLng: number) => {
  const now = Date.now();
  selectedLocations.forEach((location, idx) => {
    // 优先用解析后的经纬度
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
          message = '你已进入提醒地点附近';
        }
        Alert.alert('提醒', `${location.name}\n${message}`);
        sendNotification(message);
        setLastReminded((prev) => ({ ...prev, [key]: now }));
      }
    }
  });
};
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 身高体重设置 */}
      <View style={styles.section}>
        <Text style={styles.label}>身高 (cm)</Text>
        <TextInput
          style={styles.input}
          value={height}
          onChangeText={setHeight}
          placeholder="输入身高"
          keyboardType="numeric"
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>体重 (kg)</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          placeholder="输入体重"
          keyboardType="numeric"
        />
      </View>
      <TouchableOpacity style={styles.button} onPress={saveHeightWeight}>
        <Text style={styles.buttonText}>保存身高体重</Text>
      </TouchableOpacity>

      {/* 新增：IP定位显示 */}
      <View style={styles.section}>
        <Text style={styles.label}>IP定位（市级）</Text>
        {loadingIpLocation && <ActivityIndicator size="small" color="#4CAF50" />}
        {ipLocation && (
          <View style={{ marginTop: 10 }}>
            <Text>IP: {ipLocation.ip}</Text>
            <Text>经度: {ipLocation.location.lng}</Text>
            <Text>纬度: {ipLocation.location.lat}</Text>
            <Text>省份: {ipLocation.ad_info.province}</Text>
            <Text>城市: {ipLocation.ad_info.city}</Text>
            <Text>区县: {ipLocation.ad_info.district}</Text>
          </View>
        )}
      </View>

      {/* 提醒地点设置 */}
      <View style={styles.section}>
        <Text style={styles.label}>设置提醒地点</Text>
        <TextInput
          style={styles.input}
          value={reminderLocationInput}
          onChangeText={(text) => {
            setReminderLocationInput(text);
            getLocationSuggestions(text);
          }}
          placeholder="输入地点名称"
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

      {/* 显示已设置的提醒地点及经纬度 */}
      <View style={styles.section}>
        <Text style={styles.label}>已设置的提醒地点</Text>
        {selectedLocations.map((location, index) => (
          <View key={index} style={styles.locationItem}>
            <View>
              <Text>{location.name} - {location.type}</Text>
              <Text style={{fontSize: 12, color: '#888'}}>
                经纬度: {location.resolvedLat ?? location.lat}, {location.resolvedLng ?? location.lng}
              </Text>
            </View>
            <TouchableOpacity onPress={() => deleteLocation(index)}>
              <Text style={styles.deleteButton}>删除</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* 久坐提醒自定义语句 */}
      <View style={styles.section}>
        <Text style={styles.label}>久坐提醒语句</Text>
        <TextInput
          style={styles.input}
          value={sedentaryReminderMessage}
          onChangeText={setSedentaryReminderMessage}
          placeholder="输入久坐提醒语句"
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

      {/* 饮水提醒自定义语句 */}
      <View style={styles.section}>
        <Text style={styles.label}>饮水提醒语句</Text>
        <TextInput
          style={styles.input}
          value={drinkingReminderMessage}
          onChangeText={setDrinkingReminderMessage}
          placeholder="输入饮水提醒语句"
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

      {/* 打卡环形 */}
      <View style={styles.checkInContainer}>
        <Svg width={CIRCLE_RADIUS * 2 + 20} height={CIRCLE_RADIUS * 2 + 20}>
          {/* 背景圆 */}
          <Circle
            cx={CIRCLE_RADIUS + 10}
            cy={CIRCLE_RADIUS + 10}
            r={CIRCLE_RADIUS}
            stroke="#e0e0e0"
            strokeWidth={10}
            fill="none"
          />
          {/* 进度圆 */}
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
            {isCheckedIn ? `已打卡\n时间: ${checkInTime}\n已打卡 ${checkInDays} 天` : '点击打卡'}
          </Text>
        </TouchableOpacity>
      </View>
      {/* 底部导航 */}
      {renderNavigation()}
    </ScrollView>
  );
};

const NAVIGATION_HEIGHT = 50; // 导航栏的高度

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: NAVIGATION_HEIGHT, // 为导航栏留出空间
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