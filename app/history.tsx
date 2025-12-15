import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StorageService, SavedBill } from "./services/storage";
import Colors from "./theme/colors";

export default function History() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === "dark" ? "dark" : "light"];
  const params = useLocalSearchParams();
  const currency = params.currency;
  
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [bills, setBills] = useState<SavedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBills = async () => {
    try {
      const data = await StorageService.getBills();
      setBills(data);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Reset category on refresh if desired, or keep it. Keeping it allows users to refresh current view.
    loadBills();
  }, []);

  const categories = ["All", ...Array.from(new Set(bills.map((b) => b.category.name)))];

  const filteredBills =
    selectedCategory === "All"
      ? bills
      : bills.filter((b) => b.category.name === selectedCategory);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const renderItem = ({ item }: { item: SavedBill }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={() => {
        router.push({ 
          pathname: '/analysis', 
          params: { 
            billId: item.id,
            userCurrency: currency,
          } 
        });
      }}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.featureIconBg }]}>
        <Ionicons name={item.category.icon as any} size={24} color={theme.featureIconColor} />
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
            <Text style={[styles.merchantName, { color: theme.text }]}>
                {item.category.name}
            </Text>
            <Text style={[styles.amount, { color: theme.accent }]}>
                {item.summary.currency} {item.summary.totalAmount.toFixed(2)}
            </Text>
        </View>
        <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {formatDate(item.date)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  const renderCategory = ({ item }: { item: string }) => {
    const isSelected = item === selectedCategory;
    return (
      <TouchableOpacity
        onPress={() => setSelectedCategory(item)}
        style={[
          styles.categoryChip,
          {
            backgroundColor: isSelected ? theme.accent : theme.cardBackground,
            borderColor: isSelected ? theme.accent : theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.categoryText,
            { color: isSelected ? "#FFF" : theme.textSecondary },
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>History</Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: 'transparent' }]}
        /> 
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoriesContent}
        />
      </View>

      <FlatList
        data={filteredBills}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={theme.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No saved bills yet</Text>
            </View>
          ) : null
        }
      />
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
  categoriesContainer: {
    marginBottom: 10,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: "600",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
  },
  dateText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
});
