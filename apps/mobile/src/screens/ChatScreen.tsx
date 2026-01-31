import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, IconButton, Surface, ActivityIndicator } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { api } from '../services/api';
import { ChatMessage } from '../components/ChatInterface';
import type { ChatMessage as ChatMessageType, Cook } from '@smokering/shared';

type ChatRouteParams = {
  Chat: { cookId: string };
};

export default function ChatScreen() {
  const route = useRoute<RouteProp<ChatRouteParams, 'Chat'>>();
  const { cookId } = route.params;

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [cook, setCook] = useState<Cook | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchData = useCallback(async () => {
    try {
      const [historyResponse, cookResponse] = await Promise.all([
        api.getChatHistory(cookId),
        api.getCook(cookId),
      ]);

      if (historyResponse.success && historyResponse.data) {
        setMessages((historyResponse.data as { messages: ChatMessageType[] }).messages || []);
      }
      if (cookResponse.success && cookResponse.data) {
        setCook(cookResponse.data as Cook);
      }
    } catch (error) {
      console.error('Failed to fetch chat data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cookId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    const userMessage: ChatMessageType = {
      id: `temp-${Date.now()}`,
      cookId,
      role: 'user',
      content: inputText.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);

    try {
      const response = await api.sendChatMessage(cookId, userMessage.content);

      if (response.success && response.data) {
        const data = response.data as { message: ChatMessageType };
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== userMessage.id),
          { ...userMessage, id: `user-${Date.now()}` },
          data.message,
        ]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the temporary user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessageType }) => (
    <ChatMessage message={item} />
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      {/* Context Header */}
      {cook && (
        <Surface style={styles.contextHeader}>
          <Text variant="labelSmall" style={styles.contextLabel}>
            Current Cook
          </Text>
          <Text variant="bodyMedium" style={styles.contextValue}>
            {formatMeatCut(cook.meatCut)} • {cook.weightLbs} lbs • {cook.status}
          </Text>
        </Surface>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              AI Pit Assist
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Ask me anything about your cook! I can help with:
            </Text>
            <View style={styles.suggestionsContainer}>
              <SuggestionChip
                text="When will my brisket be done?"
                onPress={() => setInputText('When will my brisket be done?')}
              />
              <SuggestionChip
                text="Should I wrap now?"
                onPress={() => setInputText('Should I wrap now?')}
              />
              <SuggestionChip
                text="I hit the stall, what should I do?"
                onPress={() => setInputText('I hit the stall, what should I do?')}
              />
              <SuggestionChip
                text="What temp should I pull at?"
                onPress={() => setInputText('What temp should I pull at?')}
              />
            </View>
          </View>
        }
      />

      {/* Typing Indicator */}
      {isSending && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#ff6b35" />
          <Text variant="bodySmall" style={styles.typingText}>
            AI Pit Assist is thinking...
          </Text>
        </View>
      )}

      {/* Input */}
      <Surface style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about your cook..."
          placeholderTextColor="#666"
          mode="outlined"
          style={styles.input}
          outlineColor="transparent"
          activeOutlineColor="#ff6b35"
          textColor="#fff"
          multiline
          maxLength={500}
          onSubmitEditing={handleSendMessage}
        />
        <IconButton
          icon="send"
          iconColor={inputText.trim() ? '#ff6b35' : '#666'}
          size={24}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isSending}
        />
      </Surface>
    </KeyboardAvoidingView>
  );
}

function SuggestionChip({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Surface style={styles.suggestionChip} onTouchEnd={onPress}>
      <Text variant="bodySmall" style={styles.suggestionText}>
        {text}
      </Text>
    </Surface>
  );
}

function formatMeatCut(cut: string): string {
  const formatted: Record<string, string> = {
    BRISKET: 'Brisket',
    PORK_SHOULDER: 'Pork Shoulder',
    SPARE_RIBS: 'Spare Ribs',
    BABY_BACK_RIBS: 'Baby Back Ribs',
    BEEF_RIBS: 'Beef Ribs',
  };
  return formatted[cut] || cut;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  contextHeader: {
    backgroundColor: '#16213e',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f3460',
  },
  contextLabel: {
    color: '#aaa',
  },
  contextValue: {
    color: '#fff',
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#ff6b35',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  suggestionsContainer: {
    width: '100%',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#16213e',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f3460',
  },
  suggestionText: {
    color: '#ff8c42',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: {
    color: '#aaa',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#16213e',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1f3460',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    maxHeight: 100,
  },
});
