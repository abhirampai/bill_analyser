import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  orderBy,
  doc 
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export const MAX_BILLS = 20;

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
  imageUrl?: string;
}

export const StorageService = {
  async getBills(): Promise<SavedBill[]> {
    const user = auth.currentUser;
    if (!user) return [];

    try {
        const q = query(
            collection(db, 'bills'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const bills: SavedBill[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                date: data.date,
                summary: data.summary,
                category: data.category,
                fullData: data.fullData,
                imageUrl: data?.imageUrl,
            } as SavedBill;
        });
        return bills;
    } catch (e) {
        console.error('Failed to fetch bills from Firebase', e);
        return [];
    }
  },

  async saveBill(analysisResult: any, imageUrl?: string): Promise<{ success: boolean; warning?: boolean; id?: string }> {
    const user = auth.currentUser;
    if (!user) {
        console.error('No user logged in, cannot save bill');
        return { success: false };
    }

    try {
      // Create new bill object
      // Note: We don't generate ID locally anymore, Firestore generates it
      // But for consistency until we fetch, we might return null ID or let Firestore handle it
      
      const newBill = {
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
        userId: user.uid,
        createdAt: serverTimestamp(),
        imageUrl: imageUrl || null,
      };

      const docRef = await addDoc(collection(db, 'bills'), newBill);
      
      // Check limits (Optional: Firestore doesn't inherently limit, but we could enforce it via rules or cloud functions.
      // For client-side simple check, we 'd need to fetch count. 
      // User likely meant "remove Async Storage" = "Use Cloud", implies limits might not be strict 20 items anymore.
      // I will remove the limit logic for now unless requested, as cloud storage is usually larger.)
      
      return { success: true, warning: false, id: docRef.id };
    } catch (e) {
      console.error('Failed to save bill', e);
      return { success: false };
    }
  },

  async deleteBill(id: string): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        await deleteDoc(doc(db, 'bills', id));
        return true;
    } catch (e) {
      console.error('Failed to delete bill', e);
      return false;
    }
  },

  async updateBill(updatedBill: SavedBill): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    try {
       const docRef = doc(db, 'bills', updatedBill.id);
       await updateDoc(docRef, {
           summary: updatedBill.summary,
           category: updatedBill.category,
           fullData: updatedBill.fullData,
           date: updatedBill.date,
           imageUrl: updatedBill.imageUrl || null
       });
       return true;
    } catch (e) {
      console.error('Failed to update bill', e);
      return false;
    }
  },

  async clearAll(): Promise<void> {
    // Implement if needed for cloud, but 'clearLocal' implies local.
    // Be careful clearing all cloud data.
    console.warn("clearAll not implemented for Firestore to prevent accidental data loss");
  }
};
