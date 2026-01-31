import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Button,
  FAB,
  IconButton,
  Portal,
  Modal,
  TextInput,
  SegmentedButtons,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useCookStore } from '../stores/cookStore';
import { SMOKER_TYPES } from '@smokering/shared';

const smokerTypeOptions = [
  { value: 'PELLET', label: 'Pellet' },
  { value: 'OFFSET', label: 'Offset' },
  { value: 'KAMADO', label: 'Kamado' },
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'KETTLE', label: 'Kettle' },
];

export default function EquipmentScreen() {
  const { equipment, fetchEquipment, createEquipment, updateEquipment, deleteEquipment, isLoading } =
    useCookStore();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'PELLET',
    brand: '',
    model: '',
    nickname: '',
    isDefault: false,
  });

  useFocusEffect(
    useCallback(() => {
      fetchEquipment();
    }, [fetchEquipment])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEquipment();
    setRefreshing(false);
  }, [fetchEquipment]);

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      type: 'PELLET',
      brand: '',
      model: '',
      nickname: '',
      isDefault: equipment.length === 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (item: typeof equipment[0]) => {
    setEditingId(item.id);
    setFormData({
      type: item.type,
      brand: item.brand || '',
      model: item.model || '',
      nickname: item.nickname || '',
      isDefault: item.isDefault,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    await deleteEquipment(id);
  };

  const handleSave = async () => {
    if (editingId) {
      await updateEquipment(editingId, formData);
    } else {
      await createEquipment(formData);
    }
    setModalVisible(false);
  };

  const getSmokerIcon = (type: string): string => {
    const icons: Record<string, string> = {
      PELLET: 'fire',
      OFFSET: 'smoke',
      KAMADO: 'egg',
      ELECTRIC: 'lightning-bolt',
      KETTLE: 'pot-steam',
    };
    return icons[type] || 'grill';
  };

  if (isLoading && !refreshing && equipment.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ff6b35"
            colors={['#ff6b35']}
          />
        }
      >
        {equipment.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Text variant="headlineSmall" style={styles.emptyTitle}>
                No Equipment Yet
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Add your smoker to get personalized cook predictions
              </Text>
              <Button
                mode="contained"
                onPress={handleAdd}
                icon="plus"
                style={styles.addButton}
                buttonColor="#ff6b35"
              >
                Add Smoker
              </Button>
            </Card.Content>
          </Card>
        ) : (
          equipment.map((item) => (
            <Card key={item.id} style={styles.equipmentCard}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.equipmentInfo}>
                    <Text variant="titleLarge" style={styles.equipmentName}>
                      {item.nickname || `${item.brand || ''} ${item.model || ''}`.trim() || 'My Smoker'}
                    </Text>
                    <View style={styles.chipRow}>
                      <Chip
                        mode="flat"
                        style={styles.typeChip}
                        textStyle={styles.typeChipText}
                      >
                        {SMOKER_TYPES[item.type as keyof typeof SMOKER_TYPES] || item.type}
                      </Chip>
                      {item.isDefault && (
                        <Chip
                          mode="flat"
                          style={styles.defaultChip}
                          textStyle={styles.defaultChipText}
                        >
                          Default
                        </Chip>
                      )}
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <IconButton
                      icon="pencil"
                      iconColor="#ff8c42"
                      size={20}
                      onPress={() => handleEdit(item)}
                    />
                    <IconButton
                      icon="delete"
                      iconColor="#ef5350"
                      size={20}
                      onPress={() => handleDelete(item.id)}
                    />
                  </View>
                </View>
                {(item.brand || item.model) && (
                  <Text variant="bodyMedium" style={styles.brandModel}>
                    {[item.brand, item.model].filter(Boolean).join(' ')}
                  </Text>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB icon="plus" style={styles.fab} onPress={handleAdd} color="#fff" />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {editingId ? 'Edit Smoker' : 'Add Smoker'}
          </Text>

          <Text variant="labelLarge" style={styles.fieldLabel}>
            Smoker Type
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <SegmentedButtons
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
              buttons={smokerTypeOptions}
              style={styles.segmentedButtons}
            />
          </ScrollView>

          <TextInput
            label="Nickname (optional)"
            value={formData.nickname}
            onChangeText={(text) => setFormData({ ...formData, nickname: text })}
            mode="outlined"
            style={styles.input}
            outlineColor="#1f3460"
            activeOutlineColor="#ff6b35"
            textColor="#fff"
            placeholder="e.g., Big Red"
          />

          <TextInput
            label="Brand (optional)"
            value={formData.brand}
            onChangeText={(text) => setFormData({ ...formData, brand: text })}
            mode="outlined"
            style={styles.input}
            outlineColor="#1f3460"
            activeOutlineColor="#ff6b35"
            textColor="#fff"
            placeholder="e.g., Traeger, Weber"
          />

          <TextInput
            label="Model (optional)"
            value={formData.model}
            onChangeText={(text) => setFormData({ ...formData, model: text })}
            mode="outlined"
            style={styles.input}
            outlineColor="#1f3460"
            activeOutlineColor="#ff6b35"
            textColor="#fff"
            placeholder="e.g., Pro 575"
          />

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setModalVisible(false)}
              textColor="#aaa"
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              buttonColor="#ff6b35"
              loading={isLoading}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  emptyCard: {
    backgroundColor: '#16213e',
  },
  emptyContent: {
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#fff',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    paddingHorizontal: 24,
  },
  equipmentCard: {
    backgroundColor: '#16213e',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentName: {
    color: '#fff',
    fontWeight: 'bold',
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  typeChip: {
    backgroundColor: '#1f3460',
  },
  typeChipText: {
    color: '#ff8c42',
  },
  defaultChip: {
    backgroundColor: '#2e7d32',
  },
  defaultChipText: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
  },
  brandModel: {
    color: '#aaa',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#ff6b35',
  },
  modal: {
    backgroundColor: '#16213e',
    margin: 20,
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 24,
  },
  fieldLabel: {
    color: '#aaa',
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#1a1a2e',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
});
