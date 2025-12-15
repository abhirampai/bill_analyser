import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = '@bill_history_v1';
export const MAX_BILLS = 20;
export const WARN_THRESHOLD = 10;

export interface SavedBill {
  id: string;
  date: string;
  summary: {
    totalAmount: number;
    currency: string;
  };
  category: {
    name: string;
    icon: string;
  };
  fullData: any; // Store the complete analysis result
}

export const StorageService = {
  async getBills(): Promise<SavedBill[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error('Failed to load bills', e);
      return [];
    }
  },

  async saveBill(analysisResult: any): Promise<{ success: boolean; warning?: boolean; id?: string }> {
    try {
      const bills = await this.getBills();
      
      // Create new bill object
      const id = Date.now().toString();
      const newBill: SavedBill = {
        id, 
        date: new Date().toISOString(),
        summary: {
          totalAmount: analysisResult.summary.totalAmount,
          currency: analysisResult.summary.currency,
        },
        category: {
          name: analysisResult.category.name,
          icon: analysisResult.category.icon,
        },
        fullData: analysisResult,
      };

      // Add to beginning of list
      bills.unshift(newBill);

      let warning = false;

      // Check limits
      if (bills.length > MAX_BILLS) {
        // Remove oldest (from the end)
        bills.pop();
        // Since we are at max, we are definitely above warning threshold
        warning = true; 
      } else if (bills.length >= WARN_THRESHOLD) {
        warning = true;
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
      
      // Return the ID of the saved bill so we can reference it if needed
      return { success: true, warning, id };
    } catch (e) {
      console.error('Failed to save bill', e);
      return { success: false };
    }
  },

  async deleteBill(id: string): Promise<boolean> {
    try {
      const bills = await this.getBills();
      const filteredBills = bills.filter(bill => bill.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredBills));
      return true;
    } catch (e) {
      console.error('Failed to delete bill', e);
      return false;
    }
  },

  async updateBill(updatedBill: SavedBill): Promise<boolean> {
    try {
      const bills = await this.getBills();
      const index = bills.findIndex(b => b.id === updatedBill.id);
      
      if (index !== -1) {
        bills[index] = updatedBill;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to update bill', e);
      return false;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear bills', e);
    }
  }
};
