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
import Colors from "./theme/colors";
import { ocr } from "./gemini/gemini";

export default function Analysis() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { imageUri } = params;
  
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === "dark" ? "dark" : "light"];
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyzeImage();
  }, [imageUri]);

  const analyzeImage = async () => {
    if (!imageUri) return;

    try {
      setLoading(true);
      setError(null);
      
      // Read file as base64
      const base64 = await readAsStringAsync(imageUri as string, {
        encoding: "base64", // Using string literal "base64" as required
      });

      const data = await ocr(base64);
      
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to analyze bill. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (result) {
      await Clipboard.setStringAsync(JSON.stringify(result, null, 2));
      Alert.alert("Copied", "Analysis data copied to clipboard");
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.row} key={item.name}>
      <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.name}</Text>
      <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.quantity.toString()}</Text>
      <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.unit_price.toFixed(2)}</Text>
      <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.total_price.toFixed(2)}</Text>
    </View>
  );

  const renderTaxItem = ({ item }: { item: any }) => (
    <View style={styles.row} key={item.name}>
      <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.name}</Text>
      <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.amount.toFixed(2)}</Text>
    </View>
  );

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
              <Text style={[styles.columnHeader, { color: theme.text }]}>Item</Text>
              <Text style={[styles.columnHeader, { color: theme.text }]}>Qty</Text>
              <Text style={[styles.columnHeader, { color: theme.text }]}>Price</Text>
              <Text style={[styles.columnHeader, { color: theme.text }]}>Total</Text>
            </View>
            
            {result.items.map((item: any) => renderItem({ item }))}

            <View style={[styles.divider, { marginTop: 20 }]} />

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Taxes</Text>
            <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.columnHeader, { color: theme.text }]}>Tax Name</Text>
              <Text style={[styles.columnHeader, { color: theme.text }]}>Amount</Text>
            </View>
            
            {result.summary.tax.map((item: any) => renderTaxItem({ item }))}

            <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Total Amount</Text>
              <Text style={[styles.totalAmount, { color: theme.accent }]}>
                ₹{result.summary.totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
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
    fontSize: 24,
    fontWeight: "800",
  },
});
