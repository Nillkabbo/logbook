import { StyleSheet, Text, View } from 'react-native';

export default function LogsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logs</Text>
      <Text style={styles.subtitle}>Grouped history arrives in ticket 05.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
});
