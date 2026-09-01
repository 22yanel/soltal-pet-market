"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, PawPrint, ShoppingCart } from "lucide-react";
import type { CartItem, OrderForm } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const emptyForm: OrderForm = { fullName: "", phone: "", email: "", city: "", sector: "", reference: "", address: "", mapsUrl: "" };

export default function CarritoPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("soltal-pet-cart");
    const loadCart = async () => {
      if (!saved) {
        setLoaded(true);
        return;
      }

      try {
        const storedCart = JSON.parse(saved);
        const synced = await syncCart(storedCart);
        setCart(synced.items);
        if (synced.changes.length) setMessage(synced.changes.join(" "));
      } catch {
        window.localStorage.removeItem("soltal-pet-cart");
        setMessage("No pudimos recuperar el carrito guardado.");
      } finally {
        setLoaded(true);
      }
    };

    void loadCart();
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem("soltal-pet-cart", JSON.stringify(cart));
  }, [cart, loaded]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const quantity = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const changeQuantity = (id: number, amount: number) => setCart((items) => items.map((item) => item.id === id ? { ...item, quantity: Math.max(1, Math.min(item.stock, item.quantity + amount)) } : item));
  const remove = (id: number) => setCart((items) => items.filter((item) => item.id !== id));
  const setField = (field: keyof OrderForm, value: string) => setForm((current) => ({ ...current, [field]: field === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value }));

  const refreshCart = async () => {
    setSyncing(true);
    try {
      const synced = await syncCart(cart);
      setCart(synced.items);
      if (synced.changes.length) setMessage(synced.changes.join(" "));
      return synced.items;
    } finally {
      setSyncing(false);
    }
  };

  const validate = () => {
    if (!cart.length) return "Agrega productos antes de crear el pedido.";
    if (!form.fullName.trim()) return "Escribe tu nombre completo.";
    if (form.phone.length !== 10) return "El teléfono debe tener 10 dígitos.";
    if (!form.city.trim()) return "Escribe tu ciudad.";
    if (!form.address.trim()) return "Escribe tu dirección manual.";
    return "";
  };

  const createOrder = async () => {
    const error = validate();
    if (error) return setMessage(error);
    setCreating(true);
    setMessage("Creando pedido...");
    setOrderId(null);
    try {
      const currentCart = await refreshCart();
      if (!currentCart.length) {
        setMessage("Los productos del carrito ya no están disponibles.");
        return;
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ customer: form, items: currentCart }),
      });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error || "No se pudo crear el pedido.");
      const newId = result.order?.id || null;
      setOrderId(newId);
      setMessage(newId ? `Pedido creado correctamente. Tu número es #${newId}.` : "Pedido creado correctamente.");
      setCart([]);
      setForm(emptyForm);
      window.localStorage.removeItem("soltal-pet-cart");
    } catch {
      setMessage("Ocurrió un error creando el pedido. Intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  };

  return <main className="min-h-screen bg-[#f7fbf5] text-slate-900">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><a href="/" className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-700 text-white"><PawPrint /></span><span className="font-black text-green-800">SOLTAL PET MARKET</span></a><a href="/" className="flex items-center gap-2 rounded-full bg-green-50 px-5 py-3 font-black text-green-800"><ArrowLeft size={18} /> Seguir comprando</a></div></header>

    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex items-center gap-3"><span className="rounded-2xl bg-green-700 p-3 text-white"><ShoppingCart /></span><div><p className="font-black uppercase text-green-700">Tu compra</p><h1 className="text-4xl font-black">Carrito</h1></div></div>
      <div className="mt-7 rounded-[2.5rem] border border-green-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="text-2xl font-black">Productos ({quantity})</h2>{cart.length > 0 && <button onClick={() => setCart([])} className="rounded-full bg-red-50 px-5 py-3 font-black text-red-600">Vaciar carrito</button>}</div>
        {!loaded ? <p className="mt-6">Actualizando precios e inventario...</p> : cart.length === 0 ? <div className="mt-7 rounded-3xl bg-[#f7fbf5] p-8 text-center"><p className="text-lg font-bold text-slate-600">Tu carrito está vacío.</p><a href="/#productos" className="mt-5 inline-block rounded-full bg-green-700 px-7 py-3 font-black text-white">Ver productos</a></div> : <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]"><div className="space-y-4">{cart.map((item) => <div key={item.id} className="flex flex-col gap-4 rounded-3xl bg-[#f7fbf5] p-4 sm:flex-row sm:items-center"><img src={item.image} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" /><div className="flex-1"><p className="font-black">{item.name}</p><p className="text-green-700">RD${item.price.toLocaleString("es-DO")}</p><p className="mt-1 text-xs font-bold text-slate-500">Disponibles: {item.stock}</p></div><div className="flex items-center gap-3"><button onClick={() => changeQuantity(item.id, -1)} className="rounded-full bg-white px-4 py-2 font-black">−</button><span className="font-black">{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)} disabled={item.quantity >= item.stock} className="rounded-full bg-white px-4 py-2 font-black disabled:opacity-40">+</button><button onClick={() => remove(item.id)} className="font-black text-red-600">Eliminar</button></div></div>)}</div><div className="h-fit rounded-[2rem] bg-gradient-to-br from-green-950 to-green-800 p-6 text-white"><h3 className="text-2xl font-black">Resumen actualizado</h3><p className="mt-4">Productos: {quantity}</p><p className="mt-2 text-2xl font-black">Total: RD${total.toLocaleString("es-DO")}</p><button onClick={() => void refreshCart()} disabled={syncing} className="mt-5 w-full rounded-2xl border border-white/30 py-3 font-black disabled:opacity-60">{syncing ? "Actualizando..." : "Actualizar carrito"}</button><a href="#finalizar" className="mt-3 block rounded-2xl bg-lime-300 py-4 text-center font-black text-green-950">Finalizar compra</a></div></div>}
      </div>

      <div id="finalizar" className="mt-10 rounded-[2.5rem] border border-green-100 bg-white p-6 shadow-sm md:p-8"><h2 className="text-3xl font-black">Datos de entrega</h2><p className="mt-2 text-sm font-bold text-slate-500">Los campos marcados con * son obligatorios.</p><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]"><div className="grid gap-4 md:grid-cols-2"><Input label="Nombre completo *" value={form.fullName} onChange={(v) => setField("fullName", v)} /><Input label="Teléfono *" value={form.phone} onChange={(v) => setField("phone", v)} maxLength={10} /><Input label="Correo" value={form.email} onChange={(v) => setField("email", v)} /><Input label="Ciudad *" value={form.city} onChange={(v) => setField("city", v)} /><Input label="Sector" value={form.sector} onChange={(v) => setField("sector", v)} /><Input label="Referencia" value={form.reference} onChange={(v) => setField("reference", v)} /><Input label="Dirección manual *" value={form.address} onChange={(v) => setField("address", v)} full /><Input label="Link de Google Maps" value={form.mapsUrl} onChange={(v) => setField("mapsUrl", v)} full /></div><div className="h-fit rounded-[2rem] bg-gradient-to-br from-green-950 to-green-800 p-6 text-white"><p className="text-2xl font-black">Total: RD${total.toLocaleString("es-DO")}</p><button onClick={createOrder} disabled={creating || syncing || !cart.length} className="mt-6 w-full rounded-2xl bg-lime-300 py-4 font-black text-green-950 disabled:bg-slate-300">{creating ? "Verificando y creando..." : "Crear pedido y pagar"}</button>{message && <p className="mt-4 text-sm font-bold">{message}</p>}{orderId && <a href="/consultar-pedido" className="mt-4 block rounded-full bg-white px-5 py-3 text-center font-black text-green-800">Consultar este pedido</a>}</div></div></div>
    </section>
  </main>;
}

async function syncCart(items: CartItem[]) {
  const response = await fetch("/api/cart-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No se pudo actualizar el carrito.");
  }

  return {
    items: (Array.isArray(result.items) ? result.items : []) as CartItem[],
    changes: (Array.isArray(result.changes) ? result.changes : []) as string[],
  };
}

function Input({ label, value, onChange, full, maxLength }: { label: string; value: string; onChange: (value: string) => void; full?: boolean; maxLength?: number }) {
  return <div className={full ? "md:col-span-2" : ""}><label className="mb-2 block text-sm font-black">{label}</label><input value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} placeholder={label} className="w-full rounded-2xl border border-green-100 bg-[#f7fbf5] px-4 py-3 outline-none" /></div>;
}
