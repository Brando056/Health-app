import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [stepsValue, setStepsValue] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const router = useRouter();
  const [drinkData, setDrinkData] = useState<ChartData>({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
  });
  const [sleepData, setSleepData] = useState<ChartData>({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
  });
  const [stepsData, setStepsData] = useState<ChartData>({
    labels: [],
    datasets: [{ data: [] }]
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
      const dayOfWeek = today.getDay() || 7;
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
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{ data: drinkAmounts }]
      });
    } catch (error) {
      console.error('Failed to load drink data:', error);
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
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{ data: sleepHours }]
      });
    } catch (error) {
      console.error('Failed to load sleep data:', error);
    }
  };

  const loadMonthlyStepsData = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const stepKeys = allKeys.filter(key => key.startsWith('steps_'));

      if (stepKeys.length === 0) {
        setStepsData({ labels: [], datasets: [{ data: [] }] });
        return;
      }

      const stepsEntries = await AsyncStorage.multiGet(stepKeys);
      const stepsData = stepsEntries.map(([key, value]) => {
        const dateStr = key.replace('steps_', '');
        return {
          date: new Date(dateStr),
          steps: value ? parseInt(value) : 0
        };
      });

      stepsData.sort((a, b) => a.date.getTime() - b.date.getTime());
      const allDates = stepsData.map(entry => `${entry.date.getMonth() + 1}/${entry.date.getDate()}`);
      const allSteps = stepsData.map(entry => entry.steps);

      let labels: string[] = [];
      if (allDates.length <= 15) {
        labels = allDates;
      } else {
        const step = Math.floor(allDates.length / 14);
        for (let i = 0; i < allDates.length; i++) {
          if (i === 0 || i === allDates.length - 1 || i % step === 0) {
            labels.push(allDates[i]);
          } else {
            labels.push('');
          }
        }
      }

      setStepsData({ labels, datasets: [{ data: allSteps }] });
    } catch (error) {
      console.error('Failed to load steps data:', error);
    }
  };

  const openTestModal = () => {
    setIsTestModalOpen(true);
    setSelectedDate(new Date());
    setStepsValue('');
  };

  const saveTestSteps = async () => {
    if (!selectedDate || stepsValue === '') return;
    const dateKey = `steps_${selectedDate.toISOString().split('T')[0]}`;
    await AsyncStorage.setItem(dateKey, stepsValue);
    setIsTestModalOpen(false);
    loadChartData();
  };

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForLabels: { fontSize: 10 }
  };

  const renderNavigation = () => (
    <View style={styles.navigationContainer}>
      {['Health', 'Sport', 'Chart', 'Me'].map((page) => (
        <TouchableOpacity
          key={page}
          style={[styles.navButton, page === 'Chart' && styles.activeButton]}
          onPress={() => router.push(`./${page}`)}
        >
          <Text style={styles.buttonText}>{page}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Water intake chart */}
      <Text style={styles.chartTitle}>Weekly Water Intake (ml)</Text>
      <BarChart
        data={drinkData}
        width={width - 40}
        height={220}
        chartConfig={{ ...chartConfig, color: (o) => `rgba(71,136,214,${o})` }}
        yAxisLabel=''
        yAxisSuffix="ml"
        fromZero
        showValuesOnTopOfBars
        style={styles.chart}
      />

      {/* Sleep chart */}
      <Text style={styles.chartTitle}>Weekly Sleep Duration (hours)</Text>
      <BarChart
        data={sleepData}
        width={width - 40}
        height={220}
        chartConfig={{ ...chartConfig, color: (o) => `rgba(105,201,140,${o})` }}
        yAxisLabel=''
        yAxisSuffix="h"
        fromZero
        showValuesOnTopOfBars
        style={styles.chart}
      />

      {/* Step count chart */}
      <View style={styles.chartTitleContainer}>
        <Text style={styles.chartTitle}>Monthly Step Count</Text>
        <TouchableOpacity style={styles.testButton} onPress={openTestModal}>
          <Text style={styles.testButtonText}>Test Adjust</Text>
        </TouchableOpacity>
      </View>

      {hoveredStepValue && <Text style={styles.tooltipText}>{hoveredStepValue}</Text>}

      {stepsData.labels.length > 0 ? (
        <LineChart
          data={stepsData}
          width={width - 40}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (o) => `rgba(225,95,85,${o})`,
            fillShadowGradient: `rgba(225,95,85,0.2)`,
            fillShadowGradientTo: `rgba(225,95,85,0)`,
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#ffa726',
            }
          }}
          bezier
          onDataPointClick={({ index }) => setHoveredStepValue(`${stepsData.labels[index]}: ${stepsData.datasets[0].data[index]} steps`)}
          style={styles.chart}
        />
      ) : (
        <Text style={styles.noDataText}>No step data available</Text>
      )}

      {/* Date and step input Modal */}
      <Modal visible={isTestModalOpen} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adjust Step Data</Text>

            <TouchableOpacity style={styles.datePicker} onPress={() => setShowPicker(true)}>
              <Text>Select Date: {selectedDate?.toLocaleDateString() || 'Not selected'}</Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowPicker(Platform.OS === 'ios');
                  if (date) setSelectedDate(date);
                }}
              />
            )}

            <TextInput
              style={styles.stepsInput}
              placeholder="Enter steps"
              keyboardType="numeric"
              value={stepsValue}
              onChangeText={setStepsValue}
            />

            <View style={styles.buttonGroup}>
              <TouchableOpacity onPress={() => setIsTestModalOpen(false)} style={styles.modalButton}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveTestSteps} style={[styles.modalButton, styles.saveButton]}>
                <Text style={{ color: 'white' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom navigation */}
      {renderNavigation()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  chart: { marginVertical: 8, borderRadius: 16 },
  chartTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  chartTitleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  testButton: { padding: 6 },
  testButtonText: { color: '#4ECDC4' },
  tooltipText: { textAlign: 'center', color: '#555', marginBottom: 5 },
  noDataText: { textAlign: 'center', color: '#888', marginTop: 20 },
  navigationContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  navButton: { padding: 10 },
  activeButton: { backgroundColor: '#4ECDC4', borderRadius: 10 },
  buttonText: { color: '#333' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { width: '90%', backgroundColor: '#fff', padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  datePicker: { borderWidth: 1, padding: 10, borderRadius: 6, marginBottom: 10 },
  stepsInput: { borderWidth: 1, padding: 10, borderRadius: 6, marginBottom: 20 },
  buttonGroup: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalButton: { padding: 10, minWidth: 80, alignItems: 'center' },
  saveButton: { backgroundColor: '#4ECDC4', borderRadius: 6 },
});

export default Chart;
