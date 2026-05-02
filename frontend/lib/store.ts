import { create } from 'zustand';

interface PriceData {
  tao_price: number;
  market_cap: number;
  volume_24h: number;
  timestamp: string;
}

interface PriceStore {
  priceData: PriceData | null;
  setPriceData: (data: PriceData) => void;
}

export const usePriceStore = create<PriceStore>((set) => ({
  priceData: null,
  setPriceData: (data) => set({ priceData: data }),
}));
