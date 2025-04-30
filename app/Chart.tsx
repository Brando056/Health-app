import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart, LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

const Chart = () => {
  const router = useRouter();
  const [drinkData, setDrinkData] = useState<ChartData>({
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
  });
  const [sleepData, setSleepData] = useState<ChartData>({
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
  });
  const [stepsData, setStepsData] = useState<ChartData>({
    labels: Array.from({ length: 30 }, (_, i) => `${i + 1}`),
    datasets: [{ data: Array(30).fill(0) }]
  });

  const [hoveredStepValue, setHoveredStepValue] = useState<string | null>(null);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    await loadWeeklyDrinkData();
    await loadWeeklySleepData();
    await loadMonthlyStepsData();
  };

  const loadWeeklyDrinkData = async () => {
    try {
      const today = new Date();
      const dayOfWeek = today.getDay() || 7; // 将周日从0改为7
      const mondayDate = new Date(today);
      mondayDate.setDate(today.getDate() - (dayOfWeek - 1));

      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(mondayDate);
        date.setDate(mondayDate.getDate() + i);
        return date.toDateString();
      });

      const drinkAmounts = await Promise.all(
        weekDates.map(async (date) => {
          const drinkAmount = await AsyncStorage.getItem(`dailyDrinkAmount_${date}`);
          return drinkAmount ? parseInt(drinkAmount) : 0;
        })
      );

      setDrinkData({
        labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        datasets: [{ data: drinkAmounts }]
      });
    } catch (error) {
      console.error('加载饮水数据失败:', error);
    }
  };

  const loadWeeklySleepData = async () => {
    try {
      const today = new Date();
      const dayOfWeek = today.getDay() || 7;
      const mondayDate = new Date(today);
      mondayDate.setDate(today.getDate() - (dayOfWeek - 1));

      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(mondayDate);
        date.setDate(mondayDate.getDate() + i);
        return date.toDateString();
      });

      const sleepHours = await Promise.all(
        weekDates.map(async (date) => {
          const sleepHour = await AsyncStorage.getItem(`sleepHours_${date}`);
          return sleepHour ? parseFloat(sleepHour) : 0;
        })
      );

      setSleepData({
        labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        datasets: [{ data: sleepHours }]
      });
    } catch (error) {
      console.error('加载睡眠数据失败:', error);
    }
  };

  const loadMonthlyStepsData = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const monthDates = Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(year, month, i + 1);
        return date.toDateString();
      });

      const steps = await Promise.all(
        monthDates.map(async (date) => {
          const step = await AsyncStorage.getItem(`steps_${date}`);
          return step ? parseInt(step) : 0;
        })
      );

      setStepsData({
        labels: Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`),
        datasets: [{ data: steps }]
      });
    } catch (error) {
      console.error('加载步数数据失败:', error);
    }
  };

  const handleStepsDataPoint = (data: any, index: number) => {
    setHoveredStepValue(`${stepsData.labels[index]}: ${stepsData.datasets[0].data[index]} 步`);
  };

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0
  };

  const drinkChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(71, 136, 214, ${opacity})`
  };

  const sleepChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(105, 201, 140, ${opacity})`
  };

  const stepsChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(225, 95, 85, ${opacity})`
  };

  return (
    <ScrollView style={styles.container}>
      {/* 周饮水柱状图 */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>本周饮水量 (ml)</Text>
        <BarChart
          data={drinkData}
          width={width - 40}
          height={220}
          chartConfig={drinkChartConfig}
          yAxisLabel=""
          yAxisSuffix="ml"
          fromZero={true}
          showValuesOnTopOfBars={true}
          style={styles.chart}
        />
      </View>

      {/* 周睡眠柱状图 */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>本周睡眠时间 (小时)</Text>
        <BarChart
          data={sleepData}
          width={width - 40}
          height={220}
          chartConfig={sleepChartConfig}
          yAxisLabel=""
          yAxisSuffix="h"
          fromZero={true}
          showValuesOnTopOfBars={true}
          style={styles.chart}
        />
      </View>

      {/* 月步数折线图 */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>本月步数</Text>
        {hoveredStepValue && (
          <View style={styles.tooltipContainer}>
            <Text style={styles.tooltipText}>{hoveredStepValue}</Text>
          </View>
        )}
        <LineChart
          data={stepsData}
          width={width - 40}
          height={220}
          chartConfig={stepsChartConfig}
          yAxisLabel=""
          yAxisSuffix=" 步"
          bezier
          style={styles.chart}
          onDataPointClick={({ value, dataset, getColor, index }) => handleStepsDataPoint(dataset, index)}
        />
      </View>

      {/* 导航按钮 */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push({ pathname: "./Health" })}
        >
          <Text style={styles.buttonText}>Health</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push({ pathname: "./Sport" })}
        >
          <Text style={styles.buttonText}>Sport</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.activeButton]}
          onPress={() => router.push({ pathname: "./Chart" })}
        >
          <Text style={styles.buttonText}>Chart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push({ pathname: "./Me" })}
        >
          <Text style={styles.buttonText}>Me</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20
  },
  chartContainer: {
    marginBottom: 30
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  tooltipContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
    alignSelf: 'center'
  },
  tooltipText: {
    color: '#fff',
    fontSize: 14
  },
  buttonsContainer: {
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
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  }
});

export default Chart;