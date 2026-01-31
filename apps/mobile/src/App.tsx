import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, MD3DarkTheme, ActivityIndicator, Button, Card, FAB, TextInput, Chip, Surface, IconButton, ProgressBar } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom dark theme
const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#ff6b35',
    secondary: '#ff8c42',
    background: '#1a1a2e',
    surface: '#16213e',
    surfaceVariant: '#1f3460',
    onSurface: '#e8e8e8',
    onBackground: '#e8e8e8',
  },
};

// Mock data store
const useMockStore = () => {
  const [activeCook, setActiveCook] = useState<any>(null);
  const [cookHistory, setCookHistory] = useState<any[]>([
    { id: '1', meatCut: 'BRISKET', weightLbs: 14, status: 'COMPLETED', outcome: 'EXCELLENT', date: '2024-01-15', duration: '12h 30m' },
    { id: '2', meatCut: 'PORK_SHOULDER', weightLbs: 9, status: 'COMPLETED', outcome: 'GOOD', date: '2024-01-08', duration: '10h 15m' },
    { id: '3', meatCut: 'SPARE_RIBS', weightLbs: 4, status: 'COMPLETED', outcome: 'EXCELLENT', date: '2024-01-01', duration: '5h 45m' },
  ]);
  const [equipment, setEquipment] = useState<any[]>([
    { id: '1', type: 'PELLET', brand: 'Traeger', model: 'Pro 575', nickname: 'Big Red', isDefault: true },
  ]);

  return { activeCook, setActiveCook, cookHistory, setCookHistory, equipment, setEquipment };
};

// Context for mock data
const MockContext = React.createContext<any>(null);

// Home Screen with cook planning
function HomeScreen({ navigation }: any) {
  const { activeCook, setActiveCook } = React.useContext(MockContext);

  if (activeCook) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cookHeader}>
              <View>
                <Text style={styles.cookTitle}>{formatMeatCut(activeCook.meatCut)}</Text>
                <Text style={styles.cookSubtitle}>{activeCook.weightLbs} lbs • {activeCook.smokerTemp}°F</Text>
              </View>
              <Chip style={styles.activeChip}>ACTIVE</Chip>
            </View>

            <View style={styles.tempDisplay}>
              <Text style={styles.tempLabel}>Current Internal Temp</Text>
              <Text style={styles.tempValue}>{activeCook.currentTemp}°F</Text>
              <Text style={styles.targetTemp}>Target: {activeCook.targetTemp}°F</Text>
              <ProgressBar
                progress={activeCook.currentTemp / activeCook.targetTemp}
                color="#ff6b35"
                style={styles.progressBar}
              />
            </View>

            <View style={styles.predictionBox}>
              <Text style={styles.predictionLabel}>Predicted Finish</Text>
              <Text style={styles.predictionTime}>{activeCook.predictedFinish}</Text>
              <View style={styles.confidenceRow}>
                <View style={[styles.confidenceDot, { backgroundColor: '#22c55e' }]} />
                <Text style={styles.confidenceText}>High Confidence</Text>
              </View>
            </View>

            <View style={styles.phaseTimeline}>
              <Text style={styles.timelineTitle}>Cook Timeline</Text>
              {activeCook.phases.map((phase: any, index: number) => (
                <View key={index} style={styles.phaseRow}>
                  <View style={[styles.phaseDot, phase.active && styles.phaseDotActive]} />
                  <View style={styles.phaseInfo}>
                    <Text style={[styles.phaseName, phase.active && styles.phaseNameActive]}>{phase.name}</Text>
                    <Text style={styles.phaseTime}>{phase.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="outlined"
              onPress={() => Alert.alert('AI Pit Assist', 'Your brisket is progressing well! The stall should end in about 45 minutes. Keep the smoker steady at 225°F.')}
              textColor="#ff8c42"
              icon="chat"
            >
              Ask AI
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                const newTemp = Math.min(activeCook.currentTemp + Math.floor(Math.random() * 5) + 3, 205);
                setActiveCook({ ...activeCook, currentTemp: newTemp });
                Alert.alert('Temperature Logged', `Recorded ${newTemp}°F`);
              }}
              buttonColor="#ff6b35"
              icon="thermometer"
            >
              Log Temp
            </Button>
          </Card.Actions>
        </Card>

        <Button
          mode="outlined"
          onPress={() => {
            setActiveCook(null);
            Alert.alert('Cook Completed', 'Great job! Your brisket has been saved to history.');
          }}
          style={styles.completeButton}
          textColor="#22c55e"
        >
          Complete Cook
        </Button>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <Card style={styles.card}>
        <Card.Content style={styles.emptyContent}>
          <Ionicons name="flame-outline" size={64} color="#ff6b35" />
          <Text style={styles.emptyTitle}>Ready to Cook?</Text>
          <Text style={styles.emptySubtitle}>Plan your next smoke session with AI-powered predictions</Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('PlanCook')}
            icon="plus"
            style={styles.planButton}
            buttonColor="#ff6b35"
          >
            Plan a Cook
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.tipsTitle}>Quick Tips</Text>
          <Text style={styles.tipText}>• Plan your cook backwards from serve time</Text>
          <Text style={styles.tipText}>• Log temps every 30-45 minutes for accuracy</Text>
          <Text style={styles.tipText}>• Ask AI Pit Assist when you hit the stall!</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

// Plan Cook Screen
function PlanCookScreen({ navigation }: any) {
  const { setActiveCook } = React.useContext(MockContext);
  const [meatCut, setMeatCut] = useState('BRISKET');
  const [weight, setWeight] = useState('12');
  const [smokerTemp, setSmokerTemp] = useState('225');
  const [smokerType, setSmokerType] = useState('PELLET');

  const meatCuts = ['BRISKET', 'PORK_SHOULDER', 'SPARE_RIBS', 'BABY_BACK_RIBS', 'BEEF_RIBS'];
  const smokerTypes = ['PELLET', 'OFFSET', 'KAMADO', 'ELECTRIC', 'KETTLE'];

  const startCook = () => {
    const w = parseFloat(weight) || 12;
    const estimatedHours = meatCut === 'BRISKET' ? w * 1.25 : meatCut === 'PORK_SHOULDER' ? w * 1.5 : 5;
    const finishTime = new Date(Date.now() + estimatedHours * 60 * 60 * 1000);

    setActiveCook({
      meatCut,
      weightLbs: w,
      smokerTemp: parseInt(smokerTemp),
      smokerType,
      currentTemp: 42,
      targetTemp: meatCut === 'BRISKET' || meatCut === 'BEEF_RIBS' ? 203 : 195,
      predictedFinish: finishTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      phases: [
        { name: 'Preheat', time: 'Now', active: false, done: true },
        { name: 'Smoke Phase 1', time: '30 min', active: true, done: false },
        { name: 'Stall Window', time: `${Math.floor(estimatedHours * 0.4)}h`, active: false, done: false },
        { name: 'Smoke Phase 2', time: `${Math.floor(estimatedHours * 0.7)}h`, active: false, done: false },
        { name: 'Rest', time: `${Math.floor(estimatedHours)}h`, active: false, done: false },
      ],
    });
    navigation.goBack();
    Alert.alert('Cook Started!', `Your ${formatMeatCut(meatCut)} cook has begun. Estimated finish: ${finishTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>What are you cooking?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {meatCuts.map((cut) => (
              <Chip
                key={cut}
                selected={meatCut === cut}
                onPress={() => setMeatCut(cut)}
                style={[styles.chip, meatCut === cut && styles.chipSelected]}
                textStyle={meatCut === cut ? styles.chipTextSelected : styles.chipText}
              >
                {formatMeatCut(cut)}
              </Chip>
            ))}
          </ScrollView>

          <TextInput
            label="Weight (lbs)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            outlineColor="#1f3460"
            activeOutlineColor="#ff6b35"
            textColor="#fff"
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Smoker Setup</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {smokerTypes.map((type) => (
              <Chip
                key={type}
                selected={smokerType === type}
                onPress={() => setSmokerType(type)}
                style={[styles.chip, smokerType === type && styles.chipSelected]}
                textStyle={smokerType === type ? styles.chipTextSelected : styles.chipText}
              >
                {type}
              </Chip>
            ))}
          </ScrollView>

          <TextInput
            label="Smoker Temperature (°F)"
            value={smokerTemp}
            onChangeText={setSmokerTemp}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            outlineColor="#1f3460"
            activeOutlineColor="#ff6b35"
            textColor="#fff"
          />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={startCook}
        style={styles.startCookButton}
        buttonColor="#ff6b35"
        icon="fire"
      >
        Start Cook
      </Button>
    </ScrollView>
  );
}

// History Screen
function HistoryScreen() {
  const { cookHistory } = React.useContext(MockContext);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      {cookHistory.map((cook: any) => (
        <Card key={cook.id} style={styles.card}>
          <Card.Content>
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.historyTitle}>{formatMeatCut(cook.meatCut)}</Text>
                <Text style={styles.historyDate}>{cook.date}</Text>
              </View>
              <View style={styles.historyBadges}>
                <Chip style={styles.completedChip}>{cook.status}</Chip>
                <Chip style={[styles.outcomeChip, cook.outcome === 'EXCELLENT' && styles.excellentChip]}>
                  {cook.outcome}
                </Chip>
              </View>
            </View>
            <View style={styles.historyStats}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Weight</Text>
                <Text style={styles.statValue}>{cook.weightLbs} lbs</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{cook.duration}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}

// Equipment Screen
function EquipmentScreen() {
  const { equipment, setEquipment } = React.useContext(MockContext);
  const [showAdd, setShowAdd] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [newType, setNewType] = useState('PELLET');

  const addEquipment = () => {
    setEquipment([...equipment, {
      id: Date.now().toString(),
      type: newType,
      nickname: newNickname || 'My Smoker',
      isDefault: equipment.length === 0,
    }]);
    setShowAdd(false);
    setNewNickname('');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.screenContent}>
        {equipment.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content style={styles.emptyContent}>
              <Ionicons name="settings-outline" size={64} color="#ff6b35" />
              <Text style={styles.emptyTitle}>No Equipment Yet</Text>
              <Text style={styles.emptySubtitle}>Add your smoker for personalized predictions</Text>
            </Card.Content>
          </Card>
        ) : (
          equipment.map((item: any) => (
            <Card key={item.id} style={styles.card}>
              <Card.Content>
                <View style={styles.equipmentHeader}>
                  <View>
                    <Text style={styles.equipmentName}>{item.nickname || item.brand}</Text>
                    <View style={styles.equipmentChips}>
                      <Chip style={styles.typeChip}>{item.type}</Chip>
                      {item.isDefault && <Chip style={styles.defaultChip}>Default</Chip>}
                    </View>
                  </View>
                  <IconButton
                    icon="delete"
                    iconColor="#ef5350"
                    onPress={() => setEquipment(equipment.filter((e: any) => e.id !== item.id))}
                  />
                </View>
                {item.brand && <Text style={styles.equipmentBrand}>{item.brand} {item.model}</Text>}
              </Card.Content>
            </Card>
          ))
        )}

        {showAdd && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Add Smoker</Text>
              <TextInput
                label="Nickname"
                value={newNickname}
                onChangeText={setNewNickname}
                mode="outlined"
                style={styles.input}
                outlineColor="#1f3460"
                activeOutlineColor="#ff6b35"
                textColor="#fff"
                placeholder="e.g., Big Red"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {['PELLET', 'OFFSET', 'KAMADO', 'ELECTRIC', 'KETTLE'].map((type) => (
                  <Chip
                    key={type}
                    selected={newType === type}
                    onPress={() => setNewType(type)}
                    style={[styles.chip, newType === type && styles.chipSelected]}
                    textStyle={newType === type ? styles.chipTextSelected : styles.chipText}
                  >
                    {type}
                  </Chip>
                ))}
              </ScrollView>
              <View style={styles.addActions}>
                <Button mode="outlined" onPress={() => setShowAdd(false)} textColor="#aaa">Cancel</Button>
                <Button mode="contained" onPress={addEquipment} buttonColor="#ff6b35">Add</Button>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAdd(true)}
        color="#fff"
      />
    </View>
  );
}

// Profile Screen
function ProfileScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <Card style={styles.card}>
        <Card.Content style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>P</Text>
          </View>
          <Text style={styles.profileName}>Pitmaster</Text>
          <Text style={styles.profileEmail}>demo@smokering.app</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>Total Cooks</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>92%</Text>
              <Text style={styles.statLabel}>Avg Accuracy</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>Brisket</Text>
              <Text style={styles.statLabel}>Favorite Cut</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>SmokeRing v1.0.0</Text>
          <Text style={styles.aboutText}>AI-Powered BBQ Assistant</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

// Helper function
function formatMeatCut(cut: string): string {
  const map: Record<string, string> = {
    BRISKET: 'Brisket',
    PORK_SHOULDER: 'Pork Shoulder',
    SPARE_RIBS: 'Spare Ribs',
    BABY_BACK_RIBS: 'Baby Back Ribs',
    BEEF_RIBS: 'Beef Ribs',
  };
  return map[cut] || cut;
}

// Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Home') iconName = focused ? 'flame' : 'flame-outline';
          else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Equipment') iconName = focused ? 'settings' : 'settings-outline';
          else iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ff6b35',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#16213e', borderTopColor: '#1f3460' },
        headerStyle: { backgroundColor: '#16213e' },
        headerTintColor: '#fff',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'SmokeRing' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Cook History' }} />
      <Tab.Screen name="Equipment" component={EquipmentScreen} options={{ title: 'My Smokers' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

// Main App
export default function App() {
  const mockStore = useMockStore();

  return (
    <MockContext.Provider value={mockStore}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer
            theme={{
              dark: true,
              colors: {
                primary: '#ff6b35',
                background: '#1a1a2e',
                card: '#16213e',
                text: '#e8e8e8',
                border: '#1f3460',
                notification: '#ff6b35',
              },
              fonts: {
                regular: { fontFamily: 'System', fontWeight: '400' },
                medium: { fontFamily: 'System', fontWeight: '500' },
                bold: { fontFamily: 'System', fontWeight: '700' },
                heavy: { fontFamily: 'System', fontWeight: '900' },
              },
            }}
          >
            <StatusBar style="light" />
            <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#16213e' }, headerTintColor: '#fff' }}>
              <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
              <Stack.Screen name="PlanCook" component={PlanCookScreen} options={{ title: 'Plan Your Cook' }} />
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </MockContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a1a2e' },
  screenContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#16213e', marginBottom: 16, borderRadius: 12 },
  emptyContent: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  emptySubtitle: { fontSize: 16, color: '#aaa', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  planButton: { marginTop: 8 },
  tipsTitle: { fontSize: 18, fontWeight: 'bold', color: '#ff6b35', marginBottom: 12 },
  tipText: { fontSize: 14, color: '#ccc', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#ff6b35', marginBottom: 12 },
  chipScroll: { marginBottom: 16 },
  chip: { marginRight: 8, backgroundColor: '#1a1a2e', borderColor: '#1f3460', borderWidth: 1 },
  chipSelected: { backgroundColor: '#ff6b35', borderColor: '#ff6b35' },
  chipText: { color: '#aaa' },
  chipTextSelected: { color: '#fff' },
  input: { backgroundColor: '#1a1a2e', marginBottom: 12 },
  startCookButton: { marginTop: 8 },
  cookHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cookTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  cookSubtitle: { fontSize: 14, color: '#aaa', marginTop: 4 },
  activeChip: { backgroundColor: '#ff6b35' },
  tempDisplay: { alignItems: 'center', padding: 20, backgroundColor: '#1f3460', borderRadius: 12, marginBottom: 16 },
  tempLabel: { fontSize: 14, color: '#aaa' },
  tempValue: { fontSize: 48, fontWeight: 'bold', color: '#ff6b35' },
  targetTemp: { fontSize: 14, color: '#aaa', marginTop: 4 },
  progressBar: { width: '100%', marginTop: 12, height: 8, borderRadius: 4 },
  predictionBox: { alignItems: 'center', padding: 16, backgroundColor: '#1f3460', borderRadius: 12, marginBottom: 16 },
  predictionLabel: { fontSize: 14, color: '#aaa' },
  predictionTime: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginVertical: 8 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center' },
  confidenceDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  confidenceText: { fontSize: 14, color: '#aaa' },
  phaseTimeline: { marginTop: 8 },
  timelineTitle: { fontSize: 16, fontWeight: 'bold', color: '#ff6b35', marginBottom: 12 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  phaseDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1f3460', marginRight: 12 },
  phaseDotActive: { backgroundColor: '#ff6b35' },
  phaseInfo: { flex: 1 },
  phaseName: { fontSize: 14, color: '#aaa' },
  phaseNameActive: { color: '#fff', fontWeight: 'bold' },
  phaseTime: { fontSize: 12, color: '#666' },
  cardActions: { justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 16 },
  completeButton: { borderColor: '#22c55e', marginTop: 8 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  historyDate: { fontSize: 14, color: '#aaa', marginTop: 4 },
  historyBadges: { flexDirection: 'row', gap: 8 },
  completedChip: { backgroundColor: '#22c55e' },
  outcomeChip: { backgroundColor: '#1f3460' },
  excellentChip: { backgroundColor: '#4caf50' },
  historyStats: { flexDirection: 'row', gap: 24 },
  stat: {},
  statLabel: { fontSize: 12, color: '#aaa' },
  statValue: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  equipmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  equipmentName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  equipmentChips: { flexDirection: 'row', gap: 8, marginTop: 8 },
  typeChip: { backgroundColor: '#1f3460' },
  defaultChip: { backgroundColor: '#22c55e' },
  equipmentBrand: { fontSize: 14, color: '#aaa', marginTop: 8 },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#ff6b35' },
  profileHeader: { alignItems: 'center', padding: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ff6b35', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  profileEmail: { fontSize: 14, color: '#aaa', marginTop: 4 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#ff6b35' },
  aboutText: { fontSize: 14, color: '#aaa', marginBottom: 4 },
});
