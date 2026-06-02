"use client";

import { useMemo, useState } from "react";
import { ShoppingCart, PawPrint, Search, X, CreditCard, Truck, ShieldCheck, Download } from "lucide-react";
import { categories, products, type Product } from "@/data/products";
import type { CartItem, OrderForm } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

const emptyForm: OrderForm = { fullName: "", phone: "", email: "", city: "", sector: "", reference: "", address: "", mapsUrl: "" };
const animalSuggestions = ["Perros", "Gatos", "Caballos", "Vacas", "Cerdos", "Aves", "Conejos"];

export default function Home() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [status, setStatus] = useState("");

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const quantity = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const filtered = useMemo(() => {
    const text = search.toLowerCase().trim();
    return products.filter((product) => {
      const matchCategory = category === "Todos" || product.category === category;
      const matchSearch = !text || [product.name, product.category, product.subCategory].some((value) => value.toLowerCase().includes(text));
      return matchCategory && matchSearch;
    });
  }, [category, search]);

  const addToCart = (product: Product) => {
    setCart((items) => {
      const found = items.find((item) => item.id === product.id);
      if (found) return items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...items, { ...product, quantity: 1 }];
    });
  };

  const createOrder = async () => {
    setStatus("Creando pedido...");
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer: form, items: cart, total }),
    });
    setStatus(response.ok ? "Pedido creado. Falta conectar pasarela de pago." : "No se pudo crear el pedido.");
  };

  const downloadInvoice = () => {
    const content = ["Soltal Pet Market", "Factura", "", ...cart.map((item) => `${item.name} x${item.quantity} - RD${(item.price * item.quantity).toLocaleString("es-DO")}`), "", `Total: RD${total.toLocaleString("es-DO")}`].join("\n");
    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "factura-soltal-pet-market.pdf";
    link.click();
    URL.revokeObjectURL(url);
  };

  const setField = (field: keyof OrderForm, value: string) => setForm({ ...form, [field]: value });

  return (
    <main className="min-h-screen bg-[#f7fbf5] text-slate-900">
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <button onClick={() => { setSelected(null); setCategory("Todos"); setSearch(""); }} className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-700 text-white"><PawPrint /></div>
            <div className="text-left"><p className="text-xl font-black text-green-800">SOLTAL PET</p><p className="font-black text-lime-600">MARKET</p></div>
          </button>
          <a href="#carrito" className="flex items-center gap-2 rounded-full bg-green-700 px-5 py-3 font-black text-white">
            <ShoppingCart size={18} /> Ir al carrito {quantity > 0 && <span className="rounded-full bg-white px-2 text-green-700">{quantity}</span>}
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2">
        <div>
          <h1 className="text-5xl font-black">Todo para tus animales en un solo lugar</h1>
          <p className="mt-5 text-lg text-slate-700">Compra alimentos, cuidado, antipulgas, juguetes y accesorios para diferentes animales.</p>
          <div className="mt-8 flex gap-3"><a href="#productos" className="rounded-full bg-green-700 px-7 py-4 font-black text-white">Ver productos</a><a href="#carrito" className="rounded-full bg-white px-7 py-4 font-black text-green-800">Ir al carrito</a></div>
        </div>
        <div className="rounded-[2rem] bg-gradient-to-br from-green-700 to-lime-500 p-8 text-white">
          <div className="grid grid-cols-2 gap-4">
            {["Perros", "Gatos", "Caballos", "Vacas", "Cerdos", "Conejos"].map((animal) => <div key={animal} className="rounded-3xl bg-white/20 p-8 text-center font-black">{animal}</div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-3">
        <Info icon={<CreditCard />} title="Pago con tarjeta" text="Listo para conectar pasarela." />
        <Info icon={<Truck />} title="Entrega rápida" text="Pedido con dirección y Google Maps." />
        <Info icon={<ShieldCheck />} title="Productos confiables" text="Catálogo administrable." />
      </section>

      <section id="productos" className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="font-black uppercase text-green-700">Categorías</p><h2 className="text-4xl font-black">Productos</h2></div>
          <div className="relative max-w-md rounded-full bg-white px-5 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Search size={18} />
              <input value={search} onFocus={() => setShowSuggestions(true)} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar productos..." className="w-full bg-transparent outline-none" />
              {search && <button onClick={() => setSearch("")}><X size={16} /></button>}
            </div>
            {showSuggestions && <div className="absolute left-0 right-0 top-14 z-20 rounded-3xl bg-white p-3 shadow-xl">{animalSuggestions.map((animal) => <button key={animal} onMouseDown={() => { setCategory(animal); setSearch(animal); setShowSuggestions(false); }} className="mr-2 mt-2 rounded-full bg-green-50 px-4 py-2 font-bold">{animal}</button>)}</div>}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => { setCategory("Todos"); setSelected(null); }} className="rounded-full bg-green-700 px-5 py-3 font-black text-white">Todos</button>
          {categories.map((item) => <button key={item} onClick={() => { setCategory(item); setSelected(null); }} className="rounded-full bg-white px-5 py-3 font-black text-green-800">{item}</button>)}
        </div>

        {selected ? (
          <section className="mt-8 rounded-[2rem] bg-white p-6">
            <button onClick={() => setSelected(null)} className="rounded-full bg-green-50 px-5 py-2 font-black text-green-800">Volver</button>
            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <img src={selected.image} alt={selected.name} className="h-96 w-full rounded-[2rem] object-cover" />
              <div>
                <p className="font-black text-green-700">{selected.category} • {selected.subCategory}</p>
                <h2 className="mt-2 text-4xl font-black">{selected.name}</h2>
                <p className="mt-4 text-slate-600">{selected.description}</p>
                <p className="mt-6 text-4xl font-black text-green-700">RD${selected.price.toLocaleString("es-DO")}</p>
                <p className="mt-3 font-bold">Stock: {selected.stock}</p>
                <button onClick={() => addToCart(selected)} className="mt-6 rounded-2xl bg-green-700 px-8 py-4 font-black text-white">Agregar al carrito</button>
              </div>
            </div>
          </section>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {filtered.map((product) => <ProductCard key={product.id} product={product} onOpen={setSelected} onAdd={addToCart} />)}
          </div>
        )}
      </section>

      <section id="carrito" className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-[2rem] bg-white p-6">
          <h2 className="text-4xl font-black">Carrito</h2>
          {cart.length === 0 ? <p className="mt-6 text-slate-600">Tu carrito está vacío.</p> : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="space-y-4">{cart.map((item) => <div key={item.id} className="flex items-center gap-4 rounded-3xl bg-[#f7fbf5] p-4"><img src={item.image} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" /><div className="flex-1"><p className="font-black">{item.name}</p><p className="text-green-700">RD${item.price.toLocaleString("es-DO")}</p></div><button onClick={() => setCart(cart.map((p) => p.id === item.id ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p))} className="px-3 font-black">−</button><span>{item.quantity}</span><button onClick={() => addToCart(item)} className="px-3 font-black">+</button><button onClick={() => setCart(cart.filter((p) => p.id !== item.id))} className="text-red-600">Eliminar</button></div>)}</div>
              <div className="rounded-3xl bg-green-950 p-6 text-white"><h3 className="text-2xl font-black">Resumen</h3><p className="mt-4">Productos: {quantity}</p><p className="mt-2 text-2xl font-black">Total: RD${total.toLocaleString("es-DO")}</p><a href="#pago" className="mt-6 block rounded-2xl bg-lime-400 py-4 text-center font-black text-green-950">Proceder al pago</a></div>
            </div>
          )}
        </div>
      </section>

      <section id="pago" className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-[2rem] bg-white p-6">
          <h2 className="text-4xl font-black">Finalizar compra</h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Nombre completo" value={form.fullName} onChange={(v) => setField("fullName", v)} />
              <Input label="Teléfono" value={form.phone} onChange={(v) => setField("phone", v)} />
              <Input label="Correo" value={form.email} onChange={(v) => setField("email", v)} />
              <Input label="Ciudad" value={form.city} onChange={(v) => setField("city", v)} />
              <Input label="Sector" value={form.sector} onChange={(v) => setField("sector", v)} />
              <Input label="Referencia" value={form.reference} onChange={(v) => setField("reference", v)} />
              <Input label="Dirección manual" value={form.address} onChange={(v) => setField("address", v)} full />
              <Input label="Link de Google Maps" value={form.mapsUrl} onChange={(v) => setField("mapsUrl", v)} full />
            </div>
            <div className="rounded-3xl bg-green-950 p-6 text-white"><p className="text-2xl font-black">Total: RD${total.toLocaleString("es-DO")}</p><button onClick={createOrder} className="mt-6 w-full rounded-2xl bg-lime-400 py-4 font-black text-green-950">Crear pedido y pagar</button>{status && <p className="mt-4 text-sm">{status}</p>}</div>
          </div>
        </div>
      </section>

      <section id="factura" className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-[2rem] bg-white p-6">
          <h2 className="text-4xl font-black">Factura</h2>
          <button onClick={downloadInvoice} className="mt-4 flex items-center gap-2 rounded-full bg-green-700 px-6 py-3 font-black text-white"><Download size={18} /> Descargar factura</button>
        </div>
      </section>
    </main>
  );
}

function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-3xl bg-white p-6 shadow-sm"><div className="mb-4 text-green-700">{icon}</div><h3 className="font-black">{title}</h3><p className="mt-2 text-sm text-slate-600">{text}</p></div>;
}

function Input({ label, value, onChange, full = false }: { label: string; value: string; onChange: (value: string) => void; full?: boolean }) {
  return <div className={full ? "md:col-span-2" : ""}><label className="mb-2 block text-sm font-black">{label}</label><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} className="w-full rounded-2xl border border-green-100 bg-[#f7fbf5] px-4 py-3 outline-none" /></div>;
}
