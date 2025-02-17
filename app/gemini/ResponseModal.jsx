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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ResponseTable = ({ visible, onClose, billData, isLoading }) => {
  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.name}</Text>
      <Text style={styles.cell}>{item.quantity.toString()}</Text>
      <Text style={styles.cell}>{item.unit_price.toFixed(2)}</Text>
      <Text style={styles.cell}>{item.total_price.toFixed(2)}</Text>
    </View>
  );

  const renderTaxItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.name}</Text>
      <Text style={styles.cell}>{item.amount.toFixed(2)}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true} // Important for a modal look
      animationType="slide" // Or "fade", "none"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text>Analyzing...</Text>
            </View>
          ) : !billData || !billData.isBill ? (
            <Text>No bill data available.</Text>
          ) : (
            <>
              <Text style={styles.description}>
                Description: {billData.description}
              </Text>
              <Text style={styles.description}>
                Category: {billData.category}
              </Text>
              <Text style={styles.tableTitle}>Items</Text>
              <View style={styles.header}>
                <Text style={styles.headerCell}>Item</Text>
                <Text style={styles.headerCell}>Qty</Text>
                <Text style={styles.headerCell}>Unit Price</Text>
                <Text style={styles.headerCell}>Total</Text>
              </View>
              <FlatList
                data={billData.items}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()} // Important for FlatList
              />

              <Text style={styles.tableTitle}>Taxes</Text>
              <View style={styles.header}>
                <Text style={styles.headerCell}>Tax Name</Text>
                <Text style={styles.headerCell}>Amount</Text>
              </View>
              <FlatList
                data={billData.summary.tax}
                renderItem={renderTaxItem}
                keyExtractor={(item, index) => index.toString()}
              />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>
                  ₹{billData.summary.totalAmount.toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-circle" size={40} />
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
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
    height: 650,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 16, // Add some top margin
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
    textAlign: "left", // Align text to the left
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    textAlign: "left", // Align text to the left
  },
  totalRow: {
    flexDirection: "row",
    marginTop: 16,
    borderTopWidth: 1, // Add a line above the total
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
    left: "50%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ResponseTable;
