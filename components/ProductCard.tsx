"use client";

import { Heart } from "lucide-react";
import type { Product } from "@/data/products";

export default function ProductCard({
  product,
  onOpen,
  onAdd,
}: {
  product: Product;
  onOpen: (product: Product) => void;
  onAdd: (product: Product) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <button onClick={() => onOpen(product)} className="block w-full text-left">
        <img src={product.image} alt={product.name} className="h-48 w-full object-cover" />
        <div className="p-5 pb-0">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">{product.category}</span>
            <Heart size={18} className="text-slate-300" />
          </div>
          <h3 className="font-black">{product.name}</h3>
          <p className="mt-2 text-2xl font-black text-green-700">RD${product.price.toLocaleString("es-DO")}</p>
          <p className="mt-2 text-sm font-bold text-slate-500">Ver especificaciones</p>
        </div>
      </button>
      <div className="p-5 pt-4">
        <button onClick={() => onAdd(product)} className="w-full rounded-2xl bg-green-700 py-3 font-black text-white">
          Agregar al carrito
        </button>
      </div>
    </div>
  );
}
