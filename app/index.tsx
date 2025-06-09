import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        {/* Welcome title */}
        <Text style={styles.title}>Welcome to Health Assistant</Text>
        
        {/* Get Started button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push({ pathname: './Health' })}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20
  },
  content: {
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333'
  },
  startButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#4CAF50', // Green color for action button
    borderRadius: 10
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  }
});