"use client";

import { useState } from "react";
import { products as demoProducts } from "@/data/products";

export default function AdminPage() {
  const [items, setItems] = useState(demoProducts);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const addProduct = () => {
    if (!name || !price) return;
    setItems([...items, {
      id: Date.now(),
      name,
      category: "Perros",
      subCategory: "Alimentos",
      price: Number(price),
      stock: 1,
      image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=900&auto=format&fit=crop",
      description: "Producto agregado desde el panel.",
    }]);
    setName("");
    setPrice("");
  };

  return (
    <main className="min-h-screen bg-[#f7fbf5] p-6">
      <div className="mx-auto max-w-5xl rounded-[2rem] bg-white p-6">
        <p className="font-black uppercase text-green-700">Administrador</p>
        <h1 className="mt-2 text-4xl font-black">Panel de Soltal Pet Market</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-[1fr_180px_150px]">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del producto" className="rounded-2xl border px-4 py-3" />
          <input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Precio" type="number" className="rounded-2xl border px-4 py-3" />
          <button onClick={addProduct} className="rounded-2xl bg-green-700 px-4 py-3 font-black text-white">Agregar</button>
        </div>
        <div className="mt-8 rounded-3xl border">
          {items.map((product) => <div key={product.id} className="grid grid-cols-[1fr_140px_120px] gap-4 border-b p-4 text-sm"><span className="font-black">{product.name}</span><span>{product.category}</span><span className="font-black text-green-700">RD${product.price.toLocaleString("es-DO")}</span></div>)}
        </div>
      </div>
    </main>
  );
}
