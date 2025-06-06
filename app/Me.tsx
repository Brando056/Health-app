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
  const [selectedLocations, setSelectedLocations] = useState<{ name: string; lat: number; lng: number; type: string }[]>([]);
  const [suggestedLocations, setSuggestedLocations] = useState<any[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const TENCENT_MAP_API_KEY = 'X5MBZ-4M7WU-RAWVF-GVCZL-ADAKQ-D2FWN'; // 替换为你的腾讯地图 API Key
  const [sedentaryReminderMessage, setSedentaryReminderMessage] = useState('注意要多起身活动活动');
  const [drinkingReminderMessage, setDrinkingReminderMessage] = useState('注意要多喝水');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState('');
  const [showSedentaryPresets, setShowSedentaryPresets] = useState(false);
  const [showDrinkingPresets, setShowDrinkingPresets] = useState(false);

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
          distanceInterval: 10,
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

  const selectLocation = async (location: any) => {
    setReminderLocationInput(location.title);
    setIsSuggestionsVisible(false);
    const locationType = await promptLocationType();
    if (locationType) {
      const newLocation = {
        name: location.title,
        lat: location.location.lat,
        lng: location.location.lng,
        type: locationType,
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
    selectedLocations.forEach((location) => {
      const distance = calculateDistance(userLat, userLng, location.lat, location.lng);
      if (distance < 100) {
        let message = '';
        if (location.type === 'sedentary') {
          message = sedentaryReminderMessage;
          Alert.alert('久坐提醒', message);
        } else if (location.type === 'drinking') {
          message = drinkingReminderMessage;
          Alert.alert('饮水提醒', message);
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
        sound: 'default',
      },
      trigger: null,
    });
  };

  const uploadLocationsToServer = async () => {
    try {
      const response = await fetch('http://192.168.1.101:5000/submit_locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: selectedLocations }),
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

      {/* 显示已设置的提醒地点 */}
      <View style={styles.section}>
        <Text style={styles.label}>已设置的提醒地点</Text>
        {selectedLocations.map((location, index) => (
          <View key={index} style={styles.locationItem}>
            <Text>{location.name} - {location.type}</Text>
            <TouchableOpacity onPress={() => deleteLocation(index)}>
              <Text style={styles.deleteButton}>删除</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* 上传提醒地点到服务器 */}
      <TouchableOpacity style={styles.button} onPress={uploadLocationsToServer}>
        <Text style={styles.buttonText}>上传提醒地点到服务器</Text>
      </TouchableOpacity>

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
      {/* 底部导航栏 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push({ pathname: "./Health" })}>
          <Text style={styles.navText}>Health</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push({ pathname: "./Sport" })}>
          <Text style={styles.navText}>Sport</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push({ pathname: "./Chart" })}>
          <Text style={styles.navText}>Chart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.activeButton]} onPress={() => router.push({ pathname: "./Me" })}>
          <Text style={styles.navText}>Me</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
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
    padding: 10,                // 增加内边距，使输入更舒适
    borderRadius: 20,           // 增加圆角半径，使边角更圆润
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4CAF50', // 绿色背景
    padding: 14,
    borderRadius: 20,           // 增加圆角
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',        // 添加阴影
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,               // Android 阴影
  },
  buttonText: {
    color: '#000',              // 黑色文字
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkInDaysText: {
    fontSize: 16,
    marginBottom: 16,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,           // 增加圆角
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    marginBottom: 20
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8
  },
  activeButton: {
    backgroundColor: '#4CAF50'
  },
  navText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  presetContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,           // 增加圆角
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