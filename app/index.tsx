import { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, StatusBar, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { Modal, FlatList } from "react-native";
import { CURRENCIES } from "./constants/currencies";

import Colors from "./theme/colors";

export default function Index() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === "dark" ? "dark" : "light"];
  const isDark = colorScheme === "dark";

  const [currency, setCurrency] = useState<string>(getLocales()[0]?.currencyCode || 'USD');
  const [showSettings, setShowSettings] = useState(false);

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
      setShowSettings(false);
    } catch (e) {
      console.log('Failed to save currency');
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      base64: true, 
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      router.push({ pathname: '/analysis', params: { imageUri: uri, userCurrency: currency } });
    }
  };

  const FeatureCard = ({
    icon,
    title,
    description,
  }: {
    icon: any;
    title: string;
    description: string;
  }) => (
    <View
      style={[
        styles.featureCard,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
      <View
        style={[styles.featureIconContainer, { backgroundColor: theme.featureIconBg }]}
      >
        <Ionicons name={icon} size={24} color={theme.featureIconColor} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View
            style={[
              styles.logoContainer,
              {
                backgroundColor: theme.headerIconBg,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons
              name="receipt-outline"
              size={32}
              color={theme.headerIconColor}
            />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>
            Bill Analyser
          </Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>
            AI-Powered Expense Insights
          </Text>
          
          <TouchableOpacity 
            style={[styles.settingsButton, { backgroundColor: theme.cardBackground }]}
            onPress={() => setShowSettings(true)}
          >
            <Ionicons name="settings-outline" size={20} color={theme.text} />
            <Text style={[styles.currencyBadge, { color: theme.text }]}>{currency}</Text>
          </TouchableOpacity>
        </View>

        {/* Hero / Action Section */}
        <View style={styles.heroSection}>
          <TouchableOpacity
            style={[
              styles.scanButton,
              {
                backgroundColor: theme.scanButtonBg,
                borderColor: theme.border,
              },
            ]}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <BlurView
              intensity={20}
              tint={isDark ? "light" : "dark"}
              style={styles.scanButtonBlur}
            >
              <View style={styles.scanIconWrapper}>
                <Ionicons
                  name="scan-circle"
                  size={64}
                  color={isDark ? "#fff" : theme.accent}
                />
              </View>
              <Text style={[styles.scanButtonText, { color: theme.text }]}>
                Scan New Bill
              </Text>
              <Text
                style={[styles.scanButtonSubtext, { color: theme.textSecondary }]}
              >
                Upload from Gallery
              </Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Recent / Preview Section */}


        {/* Features Grid */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Capabilities
          </Text>
          <View style={styles.featuresGrid}>
            <FeatureCard
              icon="flash"
              title="Instant OCR"
              description="Extract text from bills in seconds."
            />
            <FeatureCard
              icon="pie-chart"
              title="Smart Analysis"
              description="Categorize expenses automatically."
            />
            <FeatureCard
              icon="document-text"
              title="Detailed Reports"
              description="Get itemized breakdowns."
            />
          </View>
        </View>
      </ScrollView>




      <Modal
        visible={showSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    marginTop: 4,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  scanButton: {
    width: "100%",
    height: 180,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
  },
  scanButtonBlur: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanIconWrapper: {
    marginBottom: 12,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  scanButtonText: {
    fontSize: 20,
    fontWeight: "700",
  },
  scanButtonSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 20,
    marginBottom: 16,
  },
  previewSection: {
    marginBottom: 40,
  },
  previewCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#ccc",
  },
  previewActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  secondaryButton: {
    // Styles handled inline for dynamic colors
  },
  actionButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  featuresSection: {
    paddingBottom: 20,
  },
  featuresGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
  },
  settingsButton: {
    position: 'absolute',
    right: 0,
    top: 10, // Aligned with logo
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    gap: 6,
  },
  currencyBadge: {
    fontWeight: '700',
    fontSize: 12,
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
    maxHeight: '50%',
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

