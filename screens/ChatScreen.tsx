
// Import React dan beberapa hook
import React, { useEffect, useState, useCallback } from "react";
// Import komponen UI dari React Native
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
// Import NetInfo untuk cek koneksi internet
import NetInfo from '@react-native-community/netinfo';
// Import image picker untuk memilih gambar dari galeri
import { launchImageLibrary, ImageLibraryOptions } from 'react-native-image-picker';
// Import ImageResizer untuk resize gambar
import ImageResizer from 'react-native-image-resizer';
// Import RNFS untuk membaca file sebagai base64
import RNFS from 'react-native-fs';
// Import storage dari Firebase (jika ingin upload ke storage)
import storage from '@react-native-firebase/storage';
// Import firestore untuk database
import { firestore } from "../firebase";
// Import context autentikasi
import { useAuth } from "../contexts/AuthContext";
// Import fungsi-fungsi penyimpanan offline
import {
  saveMessagesToLocal,
  getLocalMessages,
  savePendingMessage,
  getPendingMessages,
  clearPendingMessages,
  removePendingMessage,
  Message,
} from "../utils/offlineStorage";


// Konstanta untuk resize gambar
const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;
const JPEG_QUALITY = 70;


// Komponen utama untuk layar chat
export default function ChatScreen() {
  // Ambil user dan fungsi logout dari context
  const { user, logout } = useAuth();
  // State untuk input pesan
  const [message, setMessage] = useState("");
  // State untuk daftar pesan
  const [messages, setMessages] = useState<Message[]>([]);
  // State status online/offline
  const [isOnline, setIsOnline] = useState(true);
  // State status upload gambar
  const [uploading, setUploading] = useState(false);
  // State progress upload gambar
  const [uploadProgress, setUploadProgress] = useState(0);


  // Saat komponen mount, load pesan lokal dan listen status koneksi
  useEffect(() => {
    loadLocalMessages();
    const unsubscribeNetwork = NetInfo.addEventListener(handleConnectivityChange);
    
    return () => {
      unsubscribeNetwork();
    };
  }, []);


  // Listen perubahan data pesan di Firestore jika online
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


  // Fungsi untuk load pesan dari penyimpanan lokal
  const loadLocalMessages = async () => {
    const local = await getLocalMessages();
    const pending = await getPendingMessages();
    setMessages([...local, ...pending]);
  };


  // Fungsi untuk handle perubahan status koneksi
  const handleConnectivityChange = (state: any) => {
    setIsOnline(state.isConnected);
    if (state.isConnected) {
      syncPendingMessages();
    }
  };


  // Fungsi untuk mengirim pesan pending ke Firestore saat online
  const syncPendingMessages = async () => {
    const pending = await getPendingMessages();
    for (const msg of pending) {
      try {
        const messageData: Record<string, any> = {
          text: msg.text,
          user: msg.user,
          userId: msg.userId,
          createdAt: firestore.FieldValue.serverTimestamp(),
        };
        
        if (msg.imageUrl) {
          messageData.imageUrl = msg.imageUrl;
        }
        if (msg.imageBase64) {
          messageData.imageBase64 = msg.imageBase64;
        }
        
        await firestore().collection('messages').add(messageData);
        await removePendingMessage(msg.id);
      } catch (error) {
        console.error('Sync error:', error);
      }
    }
  };


  // Fungsi untuk mengirim pesan baru
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
          text: newMessage.text,
          user: newMessage.user,
          userId: newMessage.userId,
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


  // Fungsi untuk memilih gambar dari galeri, resize, dan kirim ke Firestore
  const pickAndSendImage = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.7,
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

      const resized = await ImageResizer.createResizedImage(
        asset.uri,
        MAX_WIDTH,
        MAX_HEIGHT,
        'JPEG',
        JPEG_QUALITY,
      );

      let resizedPath = resized.uri || (resized as any).path;
      if (!resizedPath) {
        return;
      }

      if (resizedPath.startsWith('file://')) {
        resizedPath = resizedPath.replace('file://', '');
      }

      const base64 = await RNFS.readFile(resizedPath, 'base64');
      const imageBase64 = `data:image/jpeg;base64,${base64}`;

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


  // Fungsi untuk logout
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


  // Fungsi untuk render setiap item pesan di list
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


  // Render UI utama layar chat
  return (
    <View style={styles.container}>
      {/* Banner offline jika tidak ada koneksi */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📵 Mode Offline</Text>
        </View>
      )}

      {/* List pesan */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
      />

      {/* Progress upload gambar */}
      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator color="#007AFF" />
          <Text style={styles.uploadingText}>
            Upload gambar... {uploadProgress.toFixed(0)}%
          </Text>
        </View>
      )}

      {/* Input pesan dan tombol kirim */}
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

      {/* Tombol logout */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}


// StyleSheet untuk styling komponen UI chat
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
