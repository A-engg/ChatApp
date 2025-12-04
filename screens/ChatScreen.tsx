import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import NetInfo from '@react-native-community/netinfo';
import { launchImageLibrary, ImageLibraryOptions } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import storage from '@react-native-firebase/storage';
import { firestore } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  saveMessagesToLocal,
  getLocalMessages,
  savePendingMessage,
  getPendingMessages,
  clearPendingMessages,
  removePendingMessage,
  Message,
} from "../utils/offlineStorage";

// Constants untuk resize
const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;
const JPEG_QUALITY = 70;

export default function ChatScreen() {
  const { user, logout } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadLocalMessages();
    const unsubscribeNetwork = NetInfo.addEventListener(handleConnectivityChange);
    
    return () => {
      unsubscribeNetwork();
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return;

    const unsub = firestore()
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        (snapshot) => {
          const list: Message[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            list.push({
              id: doc.id,
              text: data.text || '',
              user: data.user || '',
              userId: data.userId || '',
              imageUrl: data.imageUrl,
              imageBase64: data.imageBase64,
              createdAt: data.createdAt,
              synced: true,
            });
          });

          setMessages(list);
          saveMessagesToLocal(list);
        },
        (error) => {
          console.error('Firestore error:', error);
          setIsOnline(false);
        }
      );

    syncPendingMessages();

    return () => unsub();
  }, [isOnline]);

  const loadLocalMessages = async () => {
    const local = await getLocalMessages();
    const pending = await getPendingMessages();
    setMessages([...local, ...pending]);
  };

  const handleConnectivityChange = (state: any) => {
    setIsOnline(state.isConnected);
    if (state.isConnected) {
      syncPendingMessages();
    }
  };

  const syncPendingMessages = async () => {
    const pending = await getPendingMessages();
    for (const msg of pending) {
      try {
        await firestore().collection('messages').add({
          text: msg.text,
          user: msg.user,
          userId: msg.userId,
          imageUrl: msg.imageUrl,
          imageBase64: msg.imageBase64,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        await removePendingMessage(msg.id);
      } catch (error) {
        console.error('Sync error:', error);
      }
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !user) return;

    const newMessage: Omit<Message, 'id' | 'synced'> = {
      text: message.trim(),
      user: user.displayName,
      userId: user.id,
      createdAt: null,
    };

    setMessage("");

    if (isOnline) {
      try {
        await firestore().collection('messages').add({
          ...newMessage,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        console.error('Send message error:', error);
        const saved = await savePendingMessage(newMessage);
        setMessages(prev => [...prev, saved]);
      }
    } else {
      const saved = await savePendingMessage(newMessage);
      setMessages(prev => [...prev, saved]);
    }
  };

  const pickAndSendImage = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.7, // kualitas awal saat pick
    };

    const result = await launchImageLibrary(options);

    if (result.didCancel) {
      return;
    }

    const asset = result.assets?.[0];
    if (!asset || !asset.uri) {
      return;
    }

    try {
      setUploading(true);

      // 1. Resize gambar
      const resized = await ImageResizer.createResizedImage(
        asset.uri,
        MAX_WIDTH,
        MAX_HEIGHT,
        'JPEG',
        JPEG_QUALITY,
      );

      // 2. Ambil path file hasil resize
      let resizedPath = resized.uri || (resized as any).path;
      if (!resizedPath) {
        console.warn('Resize result tidak punya path/uri');
        return;
      }

      if (resizedPath.startsWith('file://')) {
        resizedPath = resizedPath.replace('file://', '');
      }

      // 3. Baca file kecil ini sebagai base64
      const base64 = await RNFS.readFile(resizedPath, 'base64');
      
      // Format base64 dengan prefix yang benar untuk ditampilkan di Image component
      const imageBase64 = `data:image/jpeg;base64,${base64}`;

      // (opsional) kalau kamu mau ekstra aman, bisa cek panjang base64 di sini
      // console.log('Base64 length:', base64.length);

      // 4. Simpan ke Firestore sebagai pesan gambar
      await firestore().collection('messages').add({
        text: '',
        imageBase64: imageBase64,
        user: user?.displayName || '',
        userId: user?.id || '',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('Error resize / upload image:', err);
      Alert.alert('Error', 'Gagal upload gambar');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: logout 
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMyMessage = item.userId === user?.id;
    
    return (
      <View
        style={[
          styles.msgBox,
          isMyMessage ? styles.myMsg : styles.otherMsg,
        ]}
      >
        <Text style={[styles.sender, isMyMessage ? styles.mySender : styles.otherSender]}>
          {item.user}
          {!item.synced && ' (mengirim...)'}
        </Text>
        {(item.imageUrl || item.imageBase64) && (
          <Image 
            source={{ uri: item.imageBase64 || item.imageUrl }} 
            style={styles.messageImage}
            resizeMode="cover"
          />
        )}
        {item.text ? (
          <Text style={[styles.messageText, isMyMessage ? styles.myText : styles.otherText]}>
            {item.text}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📵 Mode Offline</Text>
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
      />

      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator color="#007AFF" />
          <Text style={styles.uploadingText}>
            Upload gambar... {uploadProgress.toFixed(0)}%
          </Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity 
          style={styles.imageButton}
          onPress={pickAndSendImage}
          disabled={uploading}
        >
          <Text style={styles.imageButtonText}>📷</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Ketik pesan..."
          value={message}
          onChangeText={setMessage}
          editable={!uploading}
          multiline
        />

        <TouchableOpacity 
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={uploading || !message.trim()}
        >
          <Text style={styles.sendButtonText}>Kirim</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  offlineBanner: {
    backgroundColor: '#ff9500',
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  messageList: {
    padding: 10,
  },
  msgBox: {
    padding: 12,
    marginVertical: 6,
    borderRadius: 12,
    maxWidth: '80%',
  },
  myMsg: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  otherMsg: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
  },
  sender: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 12,
  },
  mySender: {
    color: '#fff',
  },
  otherSender: {
    color: '#333',
  },
  messageText: {
    fontSize: 16,
  },
  myText: {
    color: '#fff',
  },
  otherText: {
    color: '#000',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginVertical: 5,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    gap: 10,
  },
  uploadingText: {
    fontSize: 14,
    color: '#666',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    gap: 8,
  },
  imageButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  imageButtonText: {
    fontSize: 24,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 20,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 16,
  },
});
