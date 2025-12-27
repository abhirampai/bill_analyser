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
  Modal, FlatList, TextInput, KeyboardAvoidingView, Platform
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { readAsStringAsync } from "expo-file-system/legacy";

import * as Clipboard from "expo-clipboard";
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Colors from "./theme/colors";
import { ocr } from "./gemini/gemini";
import { getExchangeRates } from "./services/exchangeRate";
import { CURRENCIES } from "./constants/currencies";
import { StorageService } from "./services/storage";
import AnalysisLoading from "../components/AnalysisLoading";

export default function Analysis() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { imageUri, userCurrency, billId } = params;
  const [activeBillId, setActiveBillId] = useState<string | null>(billId as string || null);
  const [displayImage, setDisplayImage] = useState<string | null>(imageUri as string || null);
  
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === "dark" ? "dark" : "light"];
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const [targetCurrency, setTargetCurrency] = useState<string>(userCurrency as string || 'USD');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
  const [rateData, setRateData] = useState<any>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencyModalMode, setCurrencyModalMode] = useState<'target' | 'base'>('target'); 
  const [searchQuery, setSearchQuery] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null); 
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemModalType, setItemModalType] = useState<'item' | 'tax'>('item');

  const filteredCurrencies = CURRENCIES.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (billId) {
        loadFromHistory();
    } else if (imageUri) {
        analyzeImage();
    }
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
    if (!imageUri) return;

    try {
      setIsAnalyzing(true);
      setError(null);
      setRateLimited(false);
      
      const base64 = await readAsStringAsync(imageUri as string, {
        encoding: "base64",
      });

      const data = await ocr(base64);
      
      if (data.error) {
        if (data.error === "RATE_LIMIT_EXCEEDED") {
            setRateLimited(true);
            setError(data.message);
        } else {
            setError(data.error);
        }
      } else {
        // Initialize originalCurrency if not present
        if (!data.summary.originalCurrency) {
            data.summary.originalCurrency = data.summary.currency;
        }
        setResult(data);
        // Auto-save on successful analysis
        saveToHistory(data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to analyze bill. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateTotal = (currentResult: any) => {
    if (!currentResult) return 0;
    
    // Sum items
    const itemsTotal = currentResult.items.reduce((sum: number, item: any) => {
        return sum + (item.total_price || 0);
    }, 0);

    // Sum taxes
    const taxTotal = currentResult.summary.tax.reduce((sum: number, tax: any) => {
        return sum + (tax.amount || 0);
    }, 0);

    return itemsTotal + taxTotal;
  };

  const compressImage = async (uri: string): Promise<string> => {
      try {
          const manipResult = await manipulateAsync(
              uri,
              [{ resize: { width: 800 } }], // Resize to max width 800
              { compress: 0.5, format: SaveFormat.JPEG, base64: true }
          );
          return `data:image/jpeg;base64,${manipResult.base64}`;
      } catch (e) {
          console.error("Failed to compress image", e);
          return uri;
      }
  };

  const handleUpdateItem = (updatedItem: any) => {
    const newResult = { ...result };
    
    if (itemModalType === 'item') {
        const qty = parseFloat(updatedItem.quantity) || 0;
        const price = parseFloat(updatedItem.unit_price) || 0;

        if (updatedItem.index !== undefined) {
             // Update existing
             newResult.items[updatedItem.index] = {
                 ...updatedItem,
                 quantity: qty,
                 unit_price: price,
                 total_price: qty * price
             };
        } else {
             // Add new
             newResult.items.push({
                 ...updatedItem,
                 quantity: qty,
                 unit_price: price,
                 total_price: qty * price
             });
        }
    } else {
        const amount = parseFloat(updatedItem.amount) || 0;
        
        if (updatedItem.index !== undefined) {
            // Update existing tax
            newResult.summary.tax[updatedItem.index] = {
                ...updatedItem,
                amount: amount
            };
        } else {
            // Add new tax
            newResult.summary.tax.push({
                ...updatedItem,
                amount: amount
            });
        }
    }

    // Recalculate total
    newResult.summary.totalAmount = calculateTotal(newResult);
    setResult(newResult);
    setShowItemModal(false);
    setEditingItem(null);
  };

  const deleteItem = (index: number, type: 'item' | 'tax') => {
      const newResult = { ...result };
      if (type === 'item') {
          newResult.items.splice(index, 1);
      } else {
          newResult.summary.tax.splice(index, 1);
      }
      newResult.summary.totalAmount = calculateTotal(newResult);
      setResult(newResult);
  };

  const handleSave = async () => {
      setIsEditing(false);
      
      // If we are editing an existing history item
      if (activeBillId) {
          const success = await StorageService.updateBill({
              id: activeBillId,
              date: result.date || new Date().toISOString(), // Preserve date or use updated? Usually preserve.
              summary: {
                  totalAmount: result.summary.totalAmount,
                  currency: result.summary.currency,
              },
              category: result.category,
              fullData: result,
          } as any); // Casting since SavedBill interface might need slight adjustment regarding 'date' location in fullData vs root
          
          if (success) {
            Alert.alert("Success", "Bill updated successfully");
          } else {
            Alert.alert("Error", "Failed to update bill");
          }
      } else {
          // Fallback if no ID (shouldn't happen with updated logic)
          await saveToHistory(result);
      }
  };

  const loadFromHistory = async () => {
    try {
        setIsLoadingHistory(true);
        // In a real app with many items, we might want a getBill(id) method
        // For 20 items, filtering client-side is fine or using our getBills
        const bills = await StorageService.getBills();
        const found = bills.find(b => b.id === (activeBillId || billId));
        if (found) {
            setResult(found.fullData);
            if (found.imageUrl) {
                setDisplayImage(found.imageUrl);
            }
            // Ensure exchange rates can load if target currency differs
            if (found.fullData.summary.currency !== targetCurrency) {
                 fetchRates(found.fullData.summary.currency);
            }
        } else {
            setError("Bill not found in history.");
        }
    } catch (e) {
        setError("Failed to load bill.");
    } finally {
        setIsLoadingHistory(false);
    }
  };

  const saveToHistory = async (data: any, isUpdate = false) => {
    // If we have a billId, use update
    if (activeBillId) {
        // This is handled by handleSave mostly, but if we call this manually
        // we might want to ensure we don't create dupes.
        // For now, saveToHistory is mainly for the initial auto-save.
    }
    
    // For initial auto-save
    let uploadedImageUrl = undefined;
    if (imageUri && typeof imageUri === 'string' && !imageUri.startsWith('http')) {
        // It's a local file, compress and convert to base64
        const base64Image = await compressImage(imageUri);
        if (base64Image && base64Image.startsWith('data:')) {
            uploadedImageUrl = base64Image;
        }
    }

    const { success, warning, id } = await StorageService.saveBill(data, uploadedImageUrl);
    if (success) {
        if (id) setActiveBillId(id); // Capture the new ID
        
        if (warning) {
            Alert.alert(
                "Storage Warning",
                "You have reached 10 saved bills. Older bills will be automatically removed as you add new ones."
            );
        }
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
        
        {isEditing && (
            <View style={styles.editActions}>
                <TouchableOpacity onPress={() => {
                    setItemModalType('item');
                    setEditingItem({ ...item, index: result.items.indexOf(item) });
                    setShowItemModal(true);
                }}>
                    <Ionicons name="pencil" size={18} color={theme.accent} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteItem(result.items.indexOf(item), 'item')}>
                    <Ionicons name="trash" size={18} color="#FF6B6B" />
                </TouchableOpacity>
            </View>
        )}
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
        {isEditing && (
            <View style={styles.editActions}>
                <TouchableOpacity onPress={() => {
                    setItemModalType('tax');
                    setEditingItem({ ...item, index: result.summary.tax.indexOf(item) });
                    setShowItemModal(true);
                }}>
                    <Ionicons name="pencil" size={18} color={theme.accent} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteItem(result.summary.tax.indexOf(item), 'tax')}>
                    <Ionicons name="trash" size={18} color="#FF6B6B" />
                </TouchableOpacity>
            </View>
        )}
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>
            {isEditing ? "Edit Bill" : "Analysis Result"}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
            {!isEditing && (
                <TouchableOpacity 
                  onPress={copyToClipboard}
                  disabled={!result}
                  style={[styles.backButton, { opacity: result ? 1 : 0 }]}
                >
                  <Ionicons name="copy-outline" size={24} color={theme.text} />
                </TouchableOpacity>
            )}
            {!isAnalyzing && !isLoadingHistory && (
              <TouchableOpacity 
                onPress={isEditing ? handleSave : () => setIsEditing(true)}
                disabled={!result}
                style={[styles.backButton, { backgroundColor: isEditing ? theme.accent : 'transparent' }]}
              >
                <Ionicons 
                  name={isEditing ? "save" : "create-outline"} 
                  size={24} 
                  color={isEditing ? "#fff" : theme.text} 
                />
              </TouchableOpacity>
            )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {displayImage && !isAnalyzing && !isLoadingHistory && (
          <Image 
            source={{ uri: displayImage }} 
            style={[styles.previewImage, { borderColor: theme.border }]} 
            resizeMode="contain"
          />
        )}

        {isAnalyzing ? (
          <AnalysisLoading imageUri={displayImage as string} />
        ) : isLoadingHistory ? (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading Bill...</Text>
            </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
            {!rateLimited && (
                <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: theme.accent }]}
                onPress={analyzeImage}
                >
                <Text style={styles.retryButtonText}>Retry Analysis</Text>
                </TouchableOpacity>
            )}
          </View>
        ) : result ? (
          <View style={[styles.resultCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {result.description}
            </Text>

            <View style={styles.currencyInfoContainer}>
              <View style={styles.currencyBadge}>
                 <Text style={[styles.currencyLabel, { color: theme.textSecondary }]}>Detected:</Text>
                 {isEditing ? (
                     <TouchableOpacity 
                        onPress={() => {
                            setCurrencyModalMode('base');
                            setShowCurrencyModal(true);
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: theme.border, padding: 4, borderRadius: 8 }}
                     >
                         <Text style={[styles.currencyValue, { color: theme.text }]}>{result.summary.currency || 'N/A'}</Text>
                         <Ionicons name="pencil" size={12} color={theme.text} />
                     </TouchableOpacity>
                 ) : (
                    <Text style={[styles.currencyValue, { color: theme.text }]}>{result.summary.currency || 'N/A'}</Text>
                 )}
              </View>
              
              <TouchableOpacity 
                style={[styles.currencySelectButton, { backgroundColor: theme.cardBackground, borderColor: theme.accent }]}
                onPress={() => {
                    setCurrencyModalMode('target');
                    setShowCurrencyModal(true);
                }}
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
        {isEditing && (
            <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: theme.accent }]}
                onPress={() => {
                    setItemModalType('item');
                    setEditingItem({ name: '', quantity: 1, unit_price: 0 }); // Default new item
                    setShowItemModal(true);
                }}
            >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
        )}
        <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.columnHeader, { color: theme.text, flex: 2 }]}>Item</Text>
              <Text style={[styles.columnHeader, { color: theme.text, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.columnHeader, { color: theme.text, textAlign: 'right' }]}>Price</Text>
              <Text style={[styles.columnHeader, { color: theme.text, textAlign: 'right' }]}>Total</Text>
            </View>
            
            {result.items.map((item: any) => renderItem({ item }))}

        <View style={[styles.divider, { marginTop: 20 }]} />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Taxes</Text>
        {isEditing && (
            <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: theme.accent }]}
                onPress={() => {
                    setItemModalType('tax');
                    setEditingItem({ name: '', amount: 0 }); // Default new tax
                    setShowItemModal(true);
                }}
            >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Tax</Text>
            </TouchableOpacity>
        )}
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
             <Text style={[styles.modalTitle, { color: theme.text }]}>
                 {currencyModalMode === 'target' ? "Convert to" : "Set Bill Currency"}
             </Text>
             
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
                       if (currencyModalMode === 'target') {
                           setTargetCurrency(item.code);
                       } else {
                           // Editing base currency
                           const newResult = { ...result };
                           newResult.summary.currency = item.code;
                           setResult(newResult);
                       }
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

      {/* Edit Item/Tax Modal */}
      <Modal
        visible={showItemModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowItemModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingItem?.index !== undefined ? 'Edit' : 'Add'} {itemModalType === 'item' ? 'Item' : 'Tax'}
            </Text>
            
            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
                <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: (theme as any).inputBg || theme.background }]}
                    value={editingItem?.name}
                    onChangeText={(text) => setEditingItem({ ...editingItem, name: text })}
                    placeholder="Name"
                    placeholderTextColor={theme.textSecondary}
                />
            </View>

            {itemModalType === 'item' && (
                <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Qty</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: (theme as any).inputBg || theme.background }]}
                            value={editingItem?.quantity?.toString()}
                            onChangeText={(text) => setEditingItem({ ...editingItem, quantity: text })}
                            keyboardType="decimal-pad"
                            placeholder="1"
                            placeholderTextColor={theme.textSecondary}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Unit Price</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: (theme as any).inputBg || theme.background }]}
                            value={editingItem?.unit_price?.toString()}
                            onChangeText={(text) => setEditingItem({ ...editingItem, unit_price: text })}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={theme.textSecondary}
                        />
                    </View>
                </View>
            )}

            {itemModalType === 'tax' && (
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Amount</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: (theme as any).inputBg || theme.background }]}
                        value={editingItem?.amount?.toString()}
                        onChangeText={(text) => setEditingItem({ ...editingItem, amount: text })}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={theme.textSecondary}
                    />
                </View>
            )}

            <View style={styles.modalButtons}>
                <TouchableOpacity 
                    style={[styles.modalButton, { borderColor: theme.border, borderWidth: 1 }]}
                    onPress={() => setShowItemModal(false)}
                >
                    <Text style={{ color: theme.text }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: theme.accent }]}
                    onPress={() => handleUpdateItem(editingItem)}
                >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                </TouchableOpacity>
            </View>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  inputGroup: {
      marginBottom: 16,
  },
  label: {
      fontSize: 12,
      marginBottom: 6,
  },
  input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
  },
  rowInputs: {
      flexDirection: 'row',
      gap: 12,
  },
  modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 20,
  },
  modalButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
  },
});
