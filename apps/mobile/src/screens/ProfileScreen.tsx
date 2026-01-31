import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Surface, Button, List, Switch, Divider } from 'react-native-paper';
import { useAuthStore } from '../stores/authStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [tempUnit, setTempUnit] = React.useState('F');

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Surface style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text variant="headlineLarge" style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        </View>
        <Text variant="titleLarge" style={styles.email}>
          {user?.email || 'User'}
        </Text>
        <Text variant="bodyMedium" style={styles.memberSince}>
          Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear()}
        </Text>
      </Surface>

      <Surface style={styles.settingsCard}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Preferences
        </Text>

        <List.Item
          title="Temperature Unit"
          description={tempUnit === 'F' ? 'Fahrenheit' : 'Celsius'}
          left={(props) => <List.Icon {...props} icon="thermometer" color="#ff8c42" />}
          right={() => (
            <View style={styles.tempToggle}>
              <Button
                mode={tempUnit === 'F' ? 'contained' : 'outlined'}
                compact
                onPress={() => setTempUnit('F')}
                buttonColor={tempUnit === 'F' ? '#ff6b35' : undefined}
                textColor={tempUnit === 'F' ? '#fff' : '#aaa'}
                style={styles.tempButton}
              >
                °F
              </Button>
              <Button
                mode={tempUnit === 'C' ? 'contained' : 'outlined'}
                compact
                onPress={() => setTempUnit('C')}
                buttonColor={tempUnit === 'C' ? '#ff6b35' : undefined}
                textColor={tempUnit === 'C' ? '#fff' : '#aaa'}
                style={styles.tempButton}
              >
                °C
              </Button>
            </View>
          )}
          titleStyle={styles.listTitle}
          descriptionStyle={styles.listDescription}
        />

        <Divider style={styles.divider} />

        <List.Item
          title="Push Notifications"
          description="Get alerts for cook phases"
          left={(props) => <List.Icon {...props} icon="bell" color="#ff8c42" />}
          right={() => (
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              color="#ff6b35"
            />
          )}
          titleStyle={styles.listTitle}
          descriptionStyle={styles.listDescription}
        />
      </Surface>

      <Surface style={styles.statsCard}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Your Stats
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text variant="headlineMedium" style={styles.statValue}>
              0
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Total Cooks
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineMedium" style={styles.statValue}>
              --
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Avg Accuracy
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineMedium" style={styles.statValue}>
              --
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Favorite Cut
            </Text>
          </View>
        </View>
      </Surface>

      <Surface style={styles.aboutCard}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          About
        </Text>

        <List.Item
          title="App Version"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="information" color="#ff8c42" />}
          titleStyle={styles.listTitle}
          descriptionStyle={styles.listDescription}
        />

        <Divider style={styles.divider} />

        <List.Item
          title="Privacy Policy"
          left={(props) => <List.Icon {...props} icon="shield-check" color="#ff8c42" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" color="#666" />}
          titleStyle={styles.listTitle}
        />

        <Divider style={styles.divider} />

        <List.Item
          title="Terms of Service"
          left={(props) => <List.Icon {...props} icon="file-document" color="#ff8c42" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" color="#666" />}
          titleStyle={styles.listTitle}
        />
      </Surface>

      <Button
        mode="outlined"
        onPress={handleLogout}
        icon="logout"
        style={styles.logoutButton}
        textColor="#ef5350"
        contentStyle={styles.logoutButtonContent}
      >
        Sign Out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: '#16213e',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff6b35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  email: {
    color: '#fff',
    fontWeight: 'bold',
  },
  memberSince: {
    color: '#aaa',
    marginTop: 4,
  },
  settingsCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    color: '#ff6b35',
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
  },
  listTitle: {
    color: '#fff',
  },
  listDescription: {
    color: '#aaa',
  },
  divider: {
    backgroundColor: '#1f3460',
  },
  tempToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  tempButton: {
    minWidth: 48,
  },
  statsCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#ff6b35',
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#aaa',
    marginTop: 4,
  },
  aboutCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  logoutButton: {
    borderColor: '#ef5350',
    marginTop: 8,
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
});
