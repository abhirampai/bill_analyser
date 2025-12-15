import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { readAsStringAsync } from "expo-file-system/legacy";

import * as Clipboard from "expo-clipboard";
import { Modal, FlatList, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import Colors from "./theme/colors";
import { ocr } from "./gemini/gemini";
import { getExchangeRates } from "./services/exchangeRate";
import { CURRENCIES } from "./constants/currencies";
import { StorageService } from "./services/storage";

export default function Analysis() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { imageUri, userCurrency, billId } = params;
  
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === "dark" ? "dark" : "light"];
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [targetCurrency, setTargetCurrency] = useState<string>(userCurrency as string || 'USD');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
  const [rateData, setRateData] = useState<any>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCurrencies = CURRENCIES.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    analyzeImage();
  }, [imageUri, billId]);

  useEffect(() => {
    if (result?.summary?.currency && result.summary.currency !== targetCurrency) {
      fetchRates(result.summary.currency);
    }
  }, [result, targetCurrency]);

  const fetchRates = async (base: string) => {
    if (!base) return;
    const data = await getExchangeRates(base);
    if (data) {
      setRateData(data);
      setExchangeRates(data.rates);
    }
  };

  const convertPrice = (price: number) => {
    if (!exchangeRates || !result?.summary?.currency) return price;
    if (result.summary.currency === targetCurrency) return price;
    
    if (exchangeRates[targetCurrency]) {
      return price * exchangeRates[targetCurrency];
    }
    return price;
  };

  const formatPrice = (price: number, currency: string) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${price.toFixed(2)}`;
  };

  const getCurrencySymbol = (curr: string) => {
    const found = CURRENCIES.find(c => c.code === curr);
    return found ? found.symbol : curr + ' ';
  };

  const analyzeImage = async () => {
    // If we have a billId, we load from storage, skip analysis
    if (billId) {
      loadFromHistory();
      return;
    }

    if (!imageUri) return;

    try {
      setLoading(true);
      setError(null);
      
      const base64 = await readAsStringAsync(imageUri as string, {
        encoding: "base64",
      });

      const data = await ocr(base64);
      
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        // Auto-save on successful analysis
        saveToHistory(data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to analyze bill. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = async () => {
    try {
        setLoading(true);
        // In a real app with many items, we might want a getBill(id) method
        // For 20 items, filtering client-side is fine or using our getBills
        const bills = await StorageService.getBills();
        const found = bills.find(b => b.id === billId);
        if (found) {
            setResult(found.fullData);
        } else {
            setError("Bill not found in history.");
        }
    } catch (e) {
        setError("Failed to load bill.");
    } finally {
        setLoading(false);
    }
  };

  const saveToHistory = async (data: any) => {
    const { success, warning } = await StorageService.saveBill(data);
    if (success && warning) {
        Alert.alert(
            "Storage Warning",
            "You have reached 10 saved bills. Older bills will be automatically removed as you add new ones."
        );
    }
  };

  const copyToClipboard = async () => {
    if (result) {
      await Clipboard.setStringAsync(JSON.stringify(result, null, 2));
      Alert.alert("Copied", "Analysis data copied to clipboard");
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const originalTotal = item.total_price;
    const convertedTotal = convertPrice(originalTotal);
    const isConverted = result?.summary?.currency !== targetCurrency && exchangeRates;

    return (
      <View style={styles.row} key={item.name}>
        <View style={{ flex: 2 }}>
          <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.name}</Text>
        </View>
        <Text style={[styles.cell, { color: theme.textSecondary, textAlign: 'center' }]}>{item.quantity.toString()}</Text>
        <View style={[styles.cell, { alignItems: 'flex-end' }]}>
            <Text style={{ color: theme.textSecondary, textAlign: 'right' }}>
              {formatPrice(convertPrice(item.unit_price), isConverted ? targetCurrency : result?.summary?.currency || '')}
            </Text>
        </View>
        <View style={[styles.cell, { alignItems: 'flex-end' }]}>
            <Text style={{ color: theme.textSecondary, fontWeight: '600', textAlign: 'right' }}>
              {formatPrice(convertedTotal, isConverted ? targetCurrency : result?.summary?.currency || '')}
            </Text>
        </View>
      </View>
    );
  };

  const renderTaxItem = ({ item }: { item: any }) => {
    const isConverted = result?.summary?.currency !== targetCurrency && exchangeRates;
    return (
      <View style={styles.row} key={item.name}>
        <Text style={[styles.cell, { color: theme.textSecondary, flex: 2 }]}>{item.name}</Text>
        <View style={[styles.cell, { alignItems: 'flex-end' }]}>
          <Text style={{ color: theme.textSecondary, textAlign: 'right' }}>
            {formatPrice(convertPrice(item.amount), isConverted ? targetCurrency : result?.summary?.currency || '')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: theme.cardBackground }]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Analysis Result</Text>
        <TouchableOpacity 
          onPress={copyToClipboard}
          disabled={!result}
          style={[styles.backButton, { opacity: result ? 1 : 0 }]}
        >
          <Ionicons name="copy-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {imageUri && (
          <Image 
            source={{ uri: imageUri as string }} 
            style={[styles.previewImage, { borderColor: theme.border }]} 
            resizeMode="contain"
          />
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Analyzing receipt details...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: theme.accent }]}
              onPress={analyzeImage}
            >
              <Text style={styles.retryButtonText}>Retry Analysis</Text>
            </TouchableOpacity>
          </View>
        ) : result ? (
          <View style={[styles.resultCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {result.description}
            </Text>

            <View style={styles.currencyInfoContainer}>
              <View style={styles.currencyBadge}>
                 <Text style={[styles.currencyLabel, { color: theme.textSecondary }]}>Detected:</Text>
                 <Text style={[styles.currencyValue, { color: theme.text }]}>{result.summary.currency || 'N/A'}</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.currencySelectButton, { backgroundColor: theme.cardBackground, borderColor: theme.accent }]}
                onPress={() => setShowCurrencyModal(true)}
              >
                 <Text style={[styles.currencyLabel, { color: theme.textSecondary }]}>Convert to:</Text>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                   <Text style={[styles.currencyValue, { color: theme.accent }]}>{targetCurrency}</Text>
                   <Ionicons name="chevron-down" size={14} color={theme.accent} />
                 </View>
              </TouchableOpacity>
            </View>

            {rateData && result.summary.currency !== targetCurrency && (
              <Text style={[styles.rateInfo, { color: theme.textSecondary }]}>
                1 {result.summary.currency} ≈ {exchangeRates?.[targetCurrency]?.toFixed(4)} {targetCurrency}
              </Text>
            )}
            
            <View style={styles.categoryContainer}>
              <View style={[styles.categoryIcon, { backgroundColor: theme.featureIconBg }]}>
                <Ionicons name={result.category.icon} size={24} color={theme.featureIconColor} />
              </View>
              <View>
                <Text style={[styles.categoryLabel, { color: theme.textSecondary }]}>Category</Text>
                <Text style={[styles.categoryName, { color: theme.text }]}>{result.category.name}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Items</Text>
            <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.columnHeader, { color: theme.text, flex: 2 }]}>Item</Text>
              <Text style={[styles.columnHeader, { color: theme.text, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.columnHeader, { color: theme.text, textAlign: 'right' }]}>Price</Text>
              <Text style={[styles.columnHeader, { color: theme.text, textAlign: 'right' }]}>Total</Text>
            </View>
            
            {result.items.map((item: any) => renderItem({ item }))}

            <View style={[styles.divider, { marginTop: 20 }]} />

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Taxes</Text>
            <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.columnHeader, { color: theme.text, flex: 2 }]}>Tax Name</Text>
              <Text style={[styles.columnHeader, { color: theme.text, textAlign: 'right' }]}>Amount</Text>
            </View>
            
            {result.summary.tax.map((item: any) => renderTaxItem({ item }))}

            <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Total ({targetCurrency})</Text>
              <Text style={[styles.totalAmount, { color: theme.accent }]}>
                {formatPrice(convertPrice(result.summary.totalAmount), targetCurrency)}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={showCurrencyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setShowCurrencyModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
             <Text style={[styles.modalTitle, { color: theme.text }]}>Convert to</Text>
             
            <View style={[styles.searchContainer, { backgroundColor: (theme as any).searchBg || theme.cardBackground, borderColor: theme.border }]}>
               <Ionicons name="search" size={20} color={theme.textSecondary} />
               <TextInput
                 style={[styles.searchInput, { color: theme.text }]}
                 placeholder="Search currency..."
                 placeholderTextColor={theme.textSecondary}
                 value={searchQuery}
                 onChangeText={setSearchQuery}
                 autoCorrect={false}
               />
               {searchQuery.length > 0 && (
                 <TouchableOpacity onPress={() => setSearchQuery("")}>
                   <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                 </TouchableOpacity>
               )}
            </View>

              <FlatList
                data={filteredCurrencies}
                keyExtractor={item => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.currencyItem,
                      { backgroundColor: item.code === targetCurrency ? theme.accent + '20' : 'transparent' }
                    ]}
                    onPress={() => {
                      setTargetCurrency(item.code);
                      setShowCurrencyModal(false);
                    }}
                  >
                    <View>
                        <Text style={[
                        styles.currencyText,
                        { color: item.code === targetCurrency ? theme.accent : theme.text }
                        ]}>{item.code} - {item.symbol}</Text>
                        <Text style={[styles.currencyName, { color: theme.textSecondary }]}>{item.name}</Text>
                    </View>
                    {item.code === targetCurrency && <Ionicons name="checkmark" size={16} color={theme.accent} />}
                  </TouchableOpacity>
                )}
             />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    backgroundColor: "#00000010",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  resultCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc", 
    opacity: 0.2,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 12,
    opacity: 0.5,
  },
  columnHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  cell: {
    flex: 1,
    fontSize: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
  totalAmount: {
    fontWeight: "800",
  },
  currencyInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#00000008',
    padding: 12,
    borderRadius: 12,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencySelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  currencyLabel: {
    fontSize: 12,
  },
  currencyValue: {
    fontWeight: '700',
    fontSize: 14,
  },
  rateInfo: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 20,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
});
