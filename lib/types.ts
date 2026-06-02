import type { Product } from "@/data/products";
export type CartItem = Product & { quantity: number };
export type OrderForm = {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  sector: string;
  reference: string;
  address: string;
  mapsUrl: string;
};
