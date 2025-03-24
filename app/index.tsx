import { Text, View, Button } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>欢迎使用健康提醒管理系统</Text>
      <Button
        title="录入健康数据"
        onPress={() => router.push({ pathname: "./dataInput"})}
      />
      <Button
        title="查看健康数据图表"
        onPress={() => router.push({ pathname: "./charts" })}
      />
    </View>
  );
}