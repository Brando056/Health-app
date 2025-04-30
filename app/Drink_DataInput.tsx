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
    ToastAndroid,
    Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 定义每个杯子大小对应的图片路径
const cupImages: { [key: number]: any } = {
    50: require('../assets/images/cup_50ml.png'),
    100: require('../assets/images/cup_100ml.png'),
    150: require('../assets/images/cup_150ml.png'),
    200: require('../assets/images/cup_200ml.png'),
    300: require('../assets/images/cup_300ml.png')
};

// 常见容器参考
const containerReferences = [
    { name: '小茶杯', volume: 150, image: require('../assets/images/cup_150ml.png') },
    { name: '普通水杯', volume: 250, image: require('../assets/images/cup_200ml.png') },
    { name: '矿泉水瓶', volume: 500, image: require('../assets/images/cup_500ml.png') },
    { name: '运动水壶', volume: 750, image: require('../assets/images/cup_750ml.png') }
];

export default function DrinkDataInput() {
    const router = useRouter();
    const [drinkAmount, setDrinkAmount] = useState('');
    const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [todayTotal, setTodayTotal] = useState('0');
    const [isClearing, setIsClearing] = useState(false);

    // 加载当前饮水总量
    useEffect(() => {
        loadTodayDrinkAmount();
    }, []);

    const loadTodayDrinkAmount = async () => {
        try {
            const today = new Date().toDateString();
            const amount = await AsyncStorage.getItem('dailyDrinkAmount') || '0';
            setTodayTotal(amount);
        } catch (error) {
            console.error('加载饮水数据失败:', error);
            showToast('加载数据失败');
        }
    };

    // 显示提示消息
    const showToast = (message: string) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
            Alert.alert('提示', message);
        }
    };

    const handleSubmit = async () => {
        if (!drinkAmount || isNaN(parseInt(drinkAmount))) {
            Alert.alert('提示', '请输入有效的饮水量');
            return;
        }

        try {
            setIsSubmitting(true); // 开始提交，显示加载状态
            const amount = parseInt(drinkAmount);
            const now = new Date();
            const today = now.toDateString();
            
            // 保存上次饮水时间
            await AsyncStorage.setItem('lastDrinkTime', now.getTime().toString());
            
            // 获取并更新今日饮水总量
            const currentAmount = await AsyncStorage.getItem('dailyDrinkAmount') || '0';
            const newAmount = (parseInt(currentAmount) + amount).toString();
            await AsyncStorage.setItem('dailyDrinkAmount', newAmount);
            
            // 保存带日期的饮水数据用于图表显示
            await AsyncStorage.setItem(`dailyDrinkAmount_${today}`, newAmount);
            
            // 提交完成，重置加载状态
            setIsSubmitting(false);
            
            // 提示保存成功
            Alert.alert(
                '保存成功',
                `已记录 ${amount}ml 饮水量\n今日总饮水量: ${newAmount}ml`,
                [{ text: '确定', onPress: () => router.back() }]
            );
        } catch (error) {
            console.error('保存饮水数据失败:', error);
            Alert.alert('提示', '保存失败，请重试');
            setIsSubmitting(false); // 提交失败，重置状态
        }
    };

    const handleClearData = () => {
        if (todayTotal === '0') {
            showToast('今日暂无饮水数据');
            return;
        }

        Alert.alert(
            '确认清除',
            '确定要清除今日所有饮水记录吗？此操作不可恢复。',
            [
                { text: '取消', style: 'cancel' },
                { 
                    text: '确认清除', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsClearing(true); // 设置清除状态
                            
                            const today = new Date().toDateString();
                            
                            // 清除今日饮水量
                            await AsyncStorage.setItem('dailyDrinkAmount', '0');
                            await AsyncStorage.setItem(`dailyDrinkAmount_${today}`, '0');
                            
                            // 重置当前页面状态
                            setDrinkAmount('');
                            setSelectedContainer(null);
                            setTodayTotal('0');
                            
                            // 清除完成
                            setIsClearing(false);
                            showToast('今日饮水记录已清除');
                        } catch (error) {
                            console.error('清除数据失败:', error);
                            Alert.alert('提示', '清除失败，请重试');
                            setIsClearing(false);
                        }
                    } 
                }
            ]
        );
    };

    const handleNavigateBack = () => {
        // 直接使用navigation API确保返回操作执行
        try {
            router.back();
            // 如果router.back()不起作用，可以尝试以下替代方法
            setTimeout(() => {
                router.push('./Health');
            }, 100);
        } catch (error) {
            console.error('导航返回失败:', error);
            // 尝试备用导航方法
            router.push('./Health');
        }
    };

    const selectContainer = (volume: number) => {
        setDrinkAmount(volume.toString());
        setSelectedContainer(volume);
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>记录饮水量</Text>
            
            {/* 显示今日饮水总量 */}
            <View style={styles.todayTotalContainer}>
                <Text style={styles.todayTotalLabel}>今日已饮水</Text>
                <Text style={styles.todayTotalValue}>{todayTotal} ml</Text>
            </View>
            
            {/* 常见容器选择 */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>选择容器</Text>
                <Text style={styles.sectionDescription}>选择你使用的容器，快速记录饮水量</Text>
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
            
            {/* 自定义输入 */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>自定义饮水量 (ml)</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={drinkAmount}
                        onChangeText={setDrinkAmount}
                        placeholder="输入饮水量"
                        keyboardType="numeric"
                    />
                    <Text style={styles.unitText}>ml</Text>
                </View>
            </View>
            
            {/* 常用饮水量快速选择 */}
            <View style={styles.presetContainer}>
                <Text style={styles.sectionTitle}>快速选择</Text>
                <View style={styles.presetButtons}>
                    <TouchableOpacity 
                        style={styles.presetButton}
                        onPress={() => setDrinkAmount('200')}
                    >
                        <Text style={styles.presetButtonText}>200ml</Text>
                        <Text style={styles.presetDescription}>小杯水</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.presetButton}
                        onPress={() => setDrinkAmount('350')}
                    >
                        <Text style={styles.presetButtonText}>350ml</Text>
                        <Text style={styles.presetDescription}>中杯水</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.presetButton}
                        onPress={() => setDrinkAmount('500')}
                    >
                        <Text style={styles.presetButtonText}>500ml</Text>
                        <Text style={styles.presetDescription}>矿泉水</Text>
                    </TouchableOpacity>
                </View>
            </View>
            
            {/* 参考信息 */}
            <View style={styles.referenceContainer}>
                <Text style={styles.referenceTitle}>饮水量参考</Text>
                <Text style={styles.referenceText}>• 成人每日建议饮水量：1500-2000ml</Text>
                <Text style={styles.referenceText}>• 一般矿泉水瓶：500-550ml</Text>
                <Text style={styles.referenceText}>• 普通马克杯：250-300ml</Text>
                <Text style={styles.referenceText}>• 小茶杯：150-200ml</Text>
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
                        <Text style={styles.submitButtonText}>提交</Text>
                    )}
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleNavigateBack}
                    disabled={isSubmitting || isClearing}
                    activeOpacity={0.7}
                >
                    <Text style={styles.cancelButtonText}>返回</Text>
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