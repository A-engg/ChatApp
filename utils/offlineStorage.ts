import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Message {
  id: string;
  text: string;
  user: string;
  userId: string;
  imageUrl?: string;
  imageBase64?: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
  synced: boolean;
}

const MESSAGES_KEY = 'offline_messages';
const PENDING_MESSAGES_KEY = 'pending_messages';

export const saveMessagesToLocal = async (messages: Message[]) => {
  try {
    await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving messages to local:', error);
  }
};

export const getLocalMessages = async (): Promise<Message[]> => {
  try {
    const messages = await AsyncStorage.getItem(MESSAGES_KEY);
    return messages ? JSON.parse(messages) : [];
  } catch (error) {
    console.error('Error getting local messages:', error);
    return [];
  }
};

export const savePendingMessage = async (message: Omit<Message, 'id' | 'synced'>) => {
  try {
    const pending = await getPendingMessages();
    const newMessage = {
      ...message,
      id: `pending_${Date.now()}`,
      synced: false,
    };
    pending.push(newMessage);
    await AsyncStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(pending));
    return newMessage;
  } catch (error) {
    console.error('Error saving pending message:', error);
    throw error;
  }
};

export const getPendingMessages = async (): Promise<Message[]> => {
  try {
    const messages = await AsyncStorage.getItem(PENDING_MESSAGES_KEY);
    return messages ? JSON.parse(messages) : [];
  } catch (error) {
    console.error('Error getting pending messages:', error);
    return [];
  }
};

export const clearPendingMessages = async () => {
  try {
    await AsyncStorage.removeItem(PENDING_MESSAGES_KEY);
  } catch (error) {
    console.error('Error clearing pending messages:', error);
  }
};

export const removePendingMessage = async (messageId: string) => {
  try {
    const pending = await getPendingMessages();
    const filtered = pending.filter(m => m.id !== messageId);
    await AsyncStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing pending message:', error);
  }
};
