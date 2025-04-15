import { Text, View, Button } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
    const router = useRouter();

    return (
        <View style={{ flex: 1 }}>
            {/* 顶部占位部分，占总高度的三分之二 */}
            <View style={{ flex: 2 }} />
            {/* 按钮所在部分，占总高度的三分之一 */}
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Button
                    title="使用"
                    onPress={() => router.push({ pathname: "./Health" })}
                />
            </View>
        </View>
    );
}    