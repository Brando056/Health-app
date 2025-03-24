import React from 'react';
import { BarChart } from 'react-native-chart-kit';
import { useRouter } from "expo-router";
import { Text, View, Button } from "react-native";

const DrinkCountWeeklyChart = () => {
  const data = {
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    datasets: [
      {
        data: [3, 4, 2, 5, 6, 3, 4],
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  const router = useRouter();
  // 这里的 push 调用可能是多余的，暂时保留注释
  // router.push({ pathname: "/dataInput" });
  // router.push({ pathname: "/charts" });

  return (
    <View>
      <BarChart
        data={data}
        width={300}
        height={220}
        chartConfig={chartConfig}
        verticalLabelRotation={30}
        yAxisLabel="次数"
        yAxisSuffix=""
      />
      <Button title="返回首页" onPress={() => router.back()} />
    </View>
  );
};

export default DrinkCountWeeklyChart;