"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  PackageCheck,
  PackageSearch,
  PawPrint,
  Truck,
  XCircle,
} from "lucide-react";
import type { CartItem, OrderForm } from "@/lib/types";

const statusLabels: Record<string, string> = {
  received: "Recibido",
  preparing: "En preparación",
  on_the_way: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

type OrderStatusResult = {
  id: number;
  customer: OrderForm;
  items: CartItem[];
  total: number;
  status: string;
  created_at: string;
};

export default function ConsultarPedidoPage() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState<OrderStatusResult | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [address, setAddress] = useState("");
  const [sector, setSector] = useState("");
  const [reference, setReference] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");

  const canModify = order?.status === "received" || order?.status === "preparing";

  const checkOrder = async () => {
    if (!orderId.trim()) return setMessage("Escribe el número de pedido.");
    if (phone.length !== 10) return setMessage("El teléfono debe tener 10 dígitos.");

    setLoading(true);
    setMessage("Buscando pedido...");
    setOrder(null);
    setActionMessage("");
    setEditingAddress(false);

    try {
      const response = await fetch("/api/order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, phone }),
      });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error || "No se pudo consultar el pedido.");
      setOrder(result.order);
      setMessage("Pedido encontrado.");
    } catch {
      setMessage("Ocurrió un error consultando el pedido.");
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!order || !window.confirm(`¿Seguro que quieres cancelar el pedido #${order.id}?`)) return;
    await runAction({ action: "cancel", orderId: order.id, phone }, "Pedido cancelado correctamente.");
  };

  const updateAddress = async () => {
    if (!order) return;
    if (!address.trim()) return setActionMessage("Escribe la nueva dirección.");
    await runAction(
      { action: "update_address", orderId: order.id, phone, address, sector, reference, mapsUrl },
      "Dirección actualizada correctamente."
    );
  };

  const runAction = async (body: Record<string, unknown>, success: string) => {
    setActionLoading(true);
    setActionMessage("Procesando...");
    try {
      const response = await fetch("/api/customer-order-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) return setActionMessage(result.error || "No se pudo completar la solicitud.");
      setOrder(result.order);
      setActionMessage(success);
      setEditingAddress(false);
    } catch {
      setActionMessage("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setActionLoading(false);
    }
  };

  const openInvoice = () => {
    if (!order) return;
    const popup = window.open("", "_blank");
    if (!popup) return setActionMessage("Permite ventanas emergentes para ver la factura.");
    const rows = order.items.map((item) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>RD$${Number(item.price * item.quantity).toLocaleString("es-DO")}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html><head><title>Factura #${order.id}</title><style>body{font-family:Arial;padding:32px;color:#17301f}h1{color:#15803d}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:24px;font-weight:800;margin-top:24px}@media print{button{display:none}}</style></head><body><h1>Soltal Pet Market</h1><h2>Pedido #${order.id}</h2><p>${order.customer.fullName}</p><p>${order.customer.address}</p><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Subtotal</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Total: RD$${Number(order.total).toLocaleString("es-DO")}</p><button onclick="window.print()">Guardar como PDF / Imprimir</button></body></html>`);
    popup.document.close();
  };

  const startAddressEdit = () => {
    if (!order) return;
    setAddress(order.customer?.address || "");
    setSector(order.customer?.sector || "");
    setReference(order.customer?.reference || "");
    setMapsUrl(order.customer?.mapsUrl || "");
    setEditingAddress(true);
  };

  return (
    <main className="min-h-screen bg-[#f7fbf5] text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <a href="/" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-700 text-white"><PawPrint /></span>
            <span className="font-black text-green-800">SOLTAL PET MARKET</span>
          </a>
          <a href="/" className="flex items-center gap-2 rounded-full bg-green-50 px-5 py-3 font-black text-green-800"><ArrowLeft size={18} /> Volver a la tienda</a>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-12 md:py-20">
        <div className="rounded-[2.5rem] border border-green-100 bg-white p-6 shadow-sm md:p-10">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-green-700 p-3 text-white"><PackageSearch size={26} /></span>
            <div><p className="font-black uppercase text-green-700">Estado del pedido</p><h1 className="text-3xl font-black md:text-4xl">Consultar pedido</h1></div>
          </div>
          <p className="mt-4 text-slate-600">Escribe tu número de pedido y el teléfono usado al comprar.</p>
          <div className="mt-7 grid gap-4 md:grid-cols-[1fr_1fr_200px]">
            <Input label="Número de pedido" value={orderId} onChange={(v) => setOrderId(v.replace(/\D/g, ""))} />
            <Input label="Teléfono" value={phone} onChange={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))} maxLength={10} />
            <div className="flex items-end"><button onClick={checkOrder} disabled={loading} className="w-full rounded-2xl bg-green-700 px-6 py-3 font-black text-white disabled:bg-slate-300">{loading ? "Buscando..." : "Consultar"}</button></div>
          </div>
          {message && <p className="mt-5 text-sm font-bold text-slate-600">{message}</p>}

          {order && <div className="mt-7 rounded-3xl bg-[#f7fbf5] p-5 md:p-7">
            <OrderProgress status={order.status} />

            <div className="flex flex-col justify-between gap-5 md:flex-row">
              <div><p className="font-black text-green-700">Pedido #{order.id}</p><h2 className="mt-1 text-2xl font-black">Estado: {statusLabels[order.status] || order.status}</h2><p className="mt-1 text-sm text-slate-600">Fecha: {new Date(order.created_at).toLocaleString("es-DO")}</p>
                <div className="mt-4 rounded-2xl bg-white p-4 text-sm"><p className="font-black text-green-700">Dirección actual</p><p className="mt-2"><b>Dirección:</b> {order.customer?.address || "No indicada"}</p><p><b>Sector:</b> {order.customer?.sector || "No indicado"}</p><p><b>Referencia:</b> {order.customer?.reference || "No indicada"}</p></div>
              </div>
              <div className="rounded-2xl bg-white p-4 md:min-w-[280px]"><p className="text-sm font-bold text-slate-500">Total</p><p className="text-2xl font-black text-green-700">RD${Number(order.total).toLocaleString("es-DO")}</p><button onClick={openInvoice} className="mt-4 w-full rounded-full bg-green-700 px-5 py-3 font-black text-white">Ver factura / guardar PDF</button>
                {canModify ? <div className="mt-3 space-y-3"><button onClick={startAddressEdit} className="w-full rounded-full bg-lime-300 px-5 py-3 font-black text-green-950">Cambiar dirección</button><button onClick={cancelOrder} disabled={actionLoading} className="w-full rounded-full bg-red-50 px-5 py-3 font-black text-red-600">Cancelar pedido</button></div> : <p className="mt-4 rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-600">Este pedido ya no puede modificarse.</p>}
              </div>
            </div>

            {editingAddress && canModify && <div className="mt-5 rounded-3xl bg-white p-5"><h3 className="text-xl font-black">Cambiar dirección de envío</h3><div className="mt-4 grid gap-4 md:grid-cols-2"><Input label="Nueva dirección *" value={address} onChange={setAddress} /><Input label="Sector" value={sector} onChange={setSector} /><Input label="Referencia" value={reference} onChange={setReference} /><Input label="Link de Google Maps" value={mapsUrl} onChange={setMapsUrl} /></div><div className="mt-5 flex flex-wrap gap-3"><button onClick={updateAddress} disabled={actionLoading} className="rounded-full bg-green-700 px-6 py-3 font-black text-white">Guardar nueva dirección</button><button onClick={() => setEditingAddress(false)} className="rounded-full bg-slate-100 px-6 py-3 font-black">Cancelar edición</button></div></div>}
            {actionMessage && <p className="mt-4 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-800">{actionMessage}</p>}
            <div className="mt-5"><h3 className="font-black">Productos</h3><div className="mt-3 space-y-3">{order.items?.map((item, index) => <div key={`${item.id}-${index}`} className="flex justify-between rounded-2xl bg-white px-4 py-3 text-sm"><span className="font-black">{item.name} x{item.quantity}</span><span className="font-black text-green-700">RD${Number(item.price * item.quantity).toLocaleString("es-DO")}</span></div>)}</div></div>
          </div>}
        </div>
      </section>
    </main>
  );
}

const orderSteps = [
  { status: "received", label: "Recibido", icon: PackageCheck },
  { status: "preparing", label: "Preparando", icon: Clock3 },
  { status: "on_the_way", label: "En camino", icon: Truck },
  { status: "delivered", label: "Entregado", icon: Check },
];

function OrderProgress({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="mb-7 flex items-center gap-4 rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
          <XCircle size={26} />
        </span>
        <div>
          <p className="text-sm font-black uppercase tracking-wider">Seguimiento del pedido</p>
          <p className="text-xl font-black">Pedido cancelado</p>
          <p className="mt-1 text-sm text-red-600">Este pedido ya no continuará hacia la entrega.</p>
        </div>
      </div>
    );
  }

  const activeIndex = Math.max(
    0,
    orderSteps.findIndex((step) => step.status === status)
  );
  const progress = (activeIndex / (orderSteps.length - 1)) * 100;

  return (
    <div className="mb-7 rounded-3xl border border-green-100 bg-white p-5 md:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-wider text-green-700">
            Seguimiento del pedido
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Te mostramos el progreso de tu compra.
          </p>
        </div>
        <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700">
          {orderSteps[activeIndex].label}
        </span>
      </div>

      <div className="relative">
        <div className="absolute left-6 right-6 top-6 hidden h-2 rounded-full bg-slate-100 sm:block" />
        <div
          className="absolute left-6 top-6 hidden h-2 rounded-full bg-gradient-to-r from-green-700 to-lime-400 transition-all duration-700 sm:block"
          style={{ width: `calc((100% - 3rem) * ${progress / 100})` }}
        />

        <div className="relative grid gap-3 sm:grid-cols-4 sm:gap-2">
          {orderSteps.map((step, index) => {
            const Icon = step.icon;
            const completed = index <= activeIndex;
            const current = index === activeIndex;

            return (
              <div
                key={step.status}
                className={`flex items-center gap-3 rounded-2xl p-2 transition-all duration-500 sm:flex-col sm:bg-transparent sm:p-0 sm:text-center ${
                  current ? "bg-green-50 sm:scale-105" : ""
                }`}
              >
                <span
                  className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 transition-all duration-500 ${
                    completed
                      ? "border-green-100 bg-green-700 text-white shadow-lg shadow-green-700/20"
                      : "border-slate-100 bg-white text-slate-400"
                  } ${current ? "ring-4 ring-lime-200" : ""}`}
                >
                  <Icon size={21} />
                </span>
                <div>
                  <p className={`text-sm font-black ${completed ? "text-green-800" : "text-slate-400"}`}>
                    {step.label}
                  </p>
                  {current && <p className="text-xs font-bold text-lime-700">Estado actual</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number }) {
  return <div><label className="mb-2 block text-sm font-black">{label}</label><input value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" maxLength={maxLength} placeholder={label} className="w-full rounded-2xl border border-green-100 bg-[#f7fbf5] px-4 py-3 outline-none" /></div>;
}
