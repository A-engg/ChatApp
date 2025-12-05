
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import modul untuk penyimpanan lokal di React Native


export interface Message { // Struktur data pesan yang digunakan di aplikasi
  id: string; // ID unik pesan
  text: string; // Isi pesan
  user: string; // Nama pengguna pengirim
  userId: string; // ID pengguna pengirim
  imageUrl?: string; // URL gambar jika ada
  imageBase64?: string; // Gambar dalam format base64 jika ada
  createdAt: { seconds: number; nanoseconds: number } | null; // Waktu pembuatan pesan
  synced: boolean; // Status sinkronisasi pesan
}


const MESSAGES_KEY = 'offline_messages'; // Key untuk penyimpanan pesan offline di AsyncStorage
const PENDING_MESSAGES_KEY = 'pending_messages'; // Key untuk penyimpanan pesan pending di AsyncStorage


export const saveMessagesToLocal = async (messages: Message[]) => { // Menyimpan array pesan ke penyimpanan lokal
  try {
    await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(messages)); // Simpan pesan dalam bentuk string JSON
  } catch (error) {
    console.error('Error saving messages to local:', error); // Tampilkan error jika gagal
  }
};


export const getLocalMessages = async (): Promise<Message[]> => { // Mengambil array pesan dari penyimpanan lokal
  try {
    const messages = await AsyncStorage.getItem(MESSAGES_KEY); // Ambil data pesan dari AsyncStorage
    return messages ? JSON.parse(messages) : []; // Jika ada, parse JSON, jika tidak, kembalikan array kosong
  } catch (error) {
    console.error('Error getting local messages:', error); // Tampilkan error jika gagal
    return [];
  }
};


export const savePendingMessage = async (message: Omit<Message, 'id' | 'synced'>) => { // Menyimpan pesan yang belum terkirim ke penyimpanan lokal (pending)
  try {
    const pending = await getPendingMessages(); // Ambil pesan pending yang sudah ada
    const newMessage = {
      ...message, // Salin data pesan
      id: `pending_${Date.now()}`, // Buat ID unik berdasarkan waktu
      synced: false, // Tandai pesan belum sinkron
    };
    pending.push(newMessage); // Tambahkan pesan baru ke array pending
    await AsyncStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(pending)); // Simpan array pending ke AsyncStorage
    return newMessage; // Kembalikan pesan baru
  } catch (error) {
    console.error('Error saving pending message:', error); // Tampilkan error jika gagal
    throw error; // Lempar error ke pemanggil
  }
};


export const getPendingMessages = async (): Promise<Message[]> => { // Mengambil semua pesan pending dari penyimpanan lokal
  try {
    const messages = await AsyncStorage.getItem(PENDING_MESSAGES_KEY); // Ambil data pesan pending
    return messages ? JSON.parse(messages) : []; // Jika ada, parse JSON, jika tidak, kembalikan array kosong
  } catch (error) {
    console.error('Error getting pending messages:', error); // Tampilkan error jika gagal
    return [];
  }
};


export const clearPendingMessages = async () => { // Menghapus semua pesan pending dari penyimpanan lokal
  try {
    await AsyncStorage.removeItem(PENDING_MESSAGES_KEY); // Hapus item pending dari AsyncStorage
  } catch (error) {
    console.error('Error clearing pending messages:', error); // Tampilkan error jika gagal
  }
};


export const removePendingMessage = async (messageId: string) => { // Menghapus satu pesan pending berdasarkan ID
  try {
    const pending = await getPendingMessages(); // Ambil semua pesan pending
    const filtered = pending.filter(m => m.id !== messageId); // Filter pesan yang bukan dengan ID tersebut
    await AsyncStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(filtered)); // Simpan kembali array yang sudah difilter
  } catch (error) {
    console.error('Error removing pending message:', error); // Tampilkan error jika gagal
  }
};
