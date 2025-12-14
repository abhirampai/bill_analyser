import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'exchange_rates_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

interface RatesCache {
  base: string;
  date: string;
  rates: Record<string, number>;
  timestamp: number;
}

export const getExchangeRates = async (baseCurrency: string = 'USD'): Promise<RatesCache | null> => {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${baseCurrency}`);
    if (cached) {
      const data: RatesCache = JSON.parse(cached);
      const isFresh = Date.now() - data.timestamp < CACHE_DURATION;
      if (isFresh) {
        return data;
      }
    }

    const baseLower = baseCurrency.toLowerCase();
    const response = await fetch(`https://latest.currency-api.pages.dev/v1/currencies/${baseLower}.json`);
    
    if (!response.ok) throw new Error('Network response was not ok');
    
    const json = await response.json();

    const rawRates = json[baseLower];
    const normalizedRates: Record<string, number> = {};
    
    Object.keys(rawRates).forEach(key => {
      normalizedRates[key.toUpperCase()] = rawRates[key];
    });

    const cacheData: RatesCache = {
      base: baseCurrency,
      date: json.date,
      rates: normalizedRates,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(`${CACHE_KEY}_${baseCurrency}`, JSON.stringify(cacheData));
    
    return cacheData;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${baseCurrency}`);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }
};

export const convertAmount = (amount: number, from: string, to: string, rates: Record<string, number>): number => {
  if (from === to) return amount;
  
  if (rates[to]) {
    return amount * rates[to];
  }
  
  return amount;
};
