import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { useAuth } from './context/AuthContext';
import Colors from './theme/colors';
import { CURRENCIES } from './constants/currencies';
import { getLocales } from 'expo-localization';

export default function Profile() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  
  const [currency, setCurrency] = useState<string>(getLocales()[0]?.currencyCode || 'USD');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  useEffect(() => {
    loadCurrency();
  }, []);

  const loadCurrency = async () => {
    try {
      const stored = await AsyncStorage.getItem('userCurrency');
      if (stored) setCurrency(stored);
    } catch (e) {
      console.log('Failed to load currency');
    }
  };

  const saveCurrency = async (curr: string) => {
    try {
      await AsyncStorage.setItem('userCurrency', curr);
      setCurrency(curr);
      setShowCurrencyModal(false);
    } catch (e) {
      console.log('Failed to save currency');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  const SettingItem = ({ icon, label, value, onPress, isDestructive = false }: any) => (
    <TouchableOpacity 
      style={[styles.settingItem, { borderBottomColor: theme.border }]} 
      onPress={onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: isDestructive ? '#ff444420' : theme.featureIconBg }]}>
          <Ionicons name={icon} size={20} color={isDestructive ? '#ff4444' : theme.text} />
        </View>
        <Text style={[styles.settingLabel, { color: isDestructive ? '#ff4444' : theme.text }]}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{value}</Text>}
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.cardBackground }]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Info Card */}
        <View style={[styles.userCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userEmail, { color: theme.text }]}>{user?.email}</Text>
            <Text style={[styles.userStatus, { color: theme.textSecondary }]}>Free Plan</Text>
          </View>
        </View>

        {/* Settings Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PREFERENCES</Text>
        <View style={[styles.settingsGroup, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <SettingItem 
            icon="cash-outline" 
            label="Currency" 
            value={currency} 
            onPress={() => setShowCurrencyModal(true)} 
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT</Text>
        <View style={[styles.settingsGroup, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <SettingItem 
            icon="log-out-outline" 
            label="Sign Out" 
            onPress={handleSignOut}
            isDestructive 
          />
        </View>
      </ScrollView>

      {/* Currency Modal reuse */}
      <Modal
        visible={showCurrencyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={() => setShowCurrencyModal(false)}
            />
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.currencyItem,
                    { 
                      backgroundColor: item.code === currency ? theme.accent + '20' : 'transparent',
                      borderColor: theme.border
                    }
                  ]}
                  onPress={() => saveCurrency(item.code)}
                >
                  <View>
                    <Text style={[
                      styles.currencyText, 
                      { 
                        color: item.code === currency ? theme.accent : theme.text,
                        fontWeight: item.code === currency ? '700' : '600'
                      }
                    ]}>{item.code} - {item.symbol}</Text>
                    <Text style={[styles.currencyName, { color: theme.textSecondary }]}>{item.name}</Text>
                  </View>
                  {item.code === currency && (
                    <Ionicons name="checkmark" size={20} color={theme.accent} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 32,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  settingsGroup: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc2',
    borderRadius: 8,
  },
  currencyText: {
    fontSize: 16,
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 12,
  },
});
