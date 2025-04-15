import React, { useState } from 'react';
import {
    Text,
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';

// 定义每个杯子大小对应的图片路径
const cupImages: { [key: number]: any } = {
    50: require('../assets/images/cup_50ml.png'),
    100: require('../assets/images/cup_100ml.png'),
    150: require('../assets/images/cup_150ml.png'),
    200: require('../assets/images/cup_200ml.png'),
    300: require('../assets/images/cup_300ml.png')
};

export default function Drink_DataInput() {
    const router = useRouter();
    const [cupSize, setCupSize] = useState<number>(50);
    const [drinkCount, setDrinkCount] = useState<number>(0);

    const cupSizes = [50, 100, 150, 200, 300];

    return (
        <View style={styles.container}>
            {/* 左上角返回按钮 */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
            >
                <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            {/* 选择杯子大小部分 */}
            <View style={styles.section}>
                <Text style={styles.label}>这次喝水使用多大的杯子呢</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.cupSizeScroll}
                >
                    {cupSizes.map((size) => (
                        <TouchableOpacity
                            key={size}
                            style={[
                                styles.cupSizeItem,
                                cupSize === size && styles.selectedCupSizeItem
                            ]}
                            onPress={() => setCupSize(size)}
                        >
                            <Image
                                // 根据杯子大小选择对应的图片路径
                                source={cupImages[size]}
                                style={styles.cupImage}
                            />
                            <Text style={styles.cupSizeText}>{size}ml</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            {/* 选择喝水次数部分 */}
            <View style={styles.section}>
                <Text style={styles.label}>喝了多少次水呢</Text>
                <Picker
                    selectedValue={drinkCount}
                    onValueChange={(itemValue) => setDrinkCount(itemValue)}
                    style={styles.picker}
                >
                    {Array.from({ length: 16 }, (_, index) => (
                        <Picker.Item label={index.toString()} value={index} key={index} />
                    ))}
                </Picker>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16
    },
    backButton: {
        position: 'absolute',
        top: 16,
        left: 16
    },
    backButtonText: {
        fontSize: 24
    },
    section: {
        marginVertical: 16
    },
    label: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8
    },
    cupSizeScroll: {
        flexDirection: 'row'
    },
    cupSizeItem: {
        alignItems: 'center',
        marginRight: 16
    },
    selectedCupSizeItem: {
        opacity: 0.7
    },
    cupImage: {
        width: 50,
        height: 100,
        resizeMode: 'contain'
    },
    cupSizeText: {
        marginTop: 4
    },
    picker: {
        height: 150
    }
});    