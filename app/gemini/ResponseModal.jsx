import React from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Modal,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../theme/colors";

const ResponseTable = ({ visible, onClose, billData, isLoading }) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === "dark" ? "dark" : "light"];

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.name}</Text>
      <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.quantity.toString()}</Text>
      <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.unit_price.toFixed(2)}</Text>
      <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.total_price.toFixed(2)}</Text>
    </View>
  );

  const renderTaxItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.name}</Text>
      <Text style={[styles.cell, { color: theme.textSecondary }]}>{item.amount.toFixed(2)}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true} // Important for a modal look
      animationType="slide" // Or "fade", "none"
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.modalBackground }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={{ color: theme.text, marginTop: 10 }}>Analyzing...</Text>
            </View>
          ) : !billData || !billData.isBill ? (
            <Text style={{ color: theme.text }}>No bill data available.</Text>
          ) : (
            <>
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                Description: {billData.description}
              </Text>
              <View style={styles.categoryContainer}>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  Category: {billData.category.name}
                </Text>
                <Ionicons name={billData.category.icon} size={24} color="#4A90E2" />
              </View>
              <Text style={[styles.tableTitle, { color: theme.text }]}>Items</Text>
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.headerCell, { color: theme.text }]}>Item</Text>
                <Text style={[styles.headerCell, { color: theme.text }]}>Qty</Text>
                <Text style={[styles.headerCell, { color: theme.text }]}>Unit Price</Text>
                <Text style={[styles.headerCell, { color: theme.text }]}>Total</Text>
              </View>
              <FlatList
                data={billData.items}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()} // Important for FlatList
              />

              <Text style={[styles.tableTitle, { color: theme.text }]}>Taxes</Text>
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.headerCell, { color: theme.text }]}>Tax Name</Text>
                <Text style={[styles.headerCell, { color: theme.text }]}>Amount</Text>
              </View>
              <FlatList
                data={billData.summary.tax}
                renderItem={renderTaxItem}
                keyExtractor={(item, index) => index.toString()}
              />

              <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>Total:</Text>
                <Text style={[styles.totalAmount, { color: "#4A90E2" }]}>
                  ₹{billData.summary.totalAmount.toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-circle" size={40} color={theme.icon} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    width: Dimensions.get("window").width,
    padding: 20,
    paddingTop: 100,
    paddingBottom: 350,
  },
  modalContent: {
    padding: 20,
    borderRadius: 8,
    height: 650,
    borderWidth: 1,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 16,
  },
  description: {
    fontSize: 18,
    marginBottom: 2,
  },
  header: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerCell: {
    flex: 1,
    fontWeight: "bold",
    textAlign: "left",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    textAlign: "left",
  },
  totalRow: {
    flexDirection: "row",
    marginTop: 16,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  totalLabel: {
    flex: 1,
    fontWeight: "bold",
  },
  totalAmount: {
    fontWeight: "bold",
    fontSize: 16,
  },
  closeButton: {
    position: "absolute",
    bottom: 35,
    left: "45%", // Adjusted center
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    marginBottom: 8,
  },
});

export default ResponseTable;
