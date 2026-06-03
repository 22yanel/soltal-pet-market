"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCcw, Package, ShoppingBag } from "lucide-react";

type AdminProduct = {
  id: number;
  name: string;
  category: string;
  sub_category: string;
  price: number;
  stock: number;
  image: string;
  description: string;
};

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category?: string;
};

type AdminOrder = {
  id: number;
  customer: {
    fullName?: string;
    phone?: string;
    email?: string;
    city?: string;
    sector?: string;
    reference?: string;
    address?: string;
    mapsUrl?: string;
  };
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
};

const categories = [
  "Perros",
  "Gatos",
  "Caballos",
  "Vacas",
  "Cerdos",
  "Aves",
  "Conejos",
  "Shampoo y cuidado",
  "Antipulgas",
  "Accesorios",
];

const emptyForm = {
  name: "",
  category: "Perros",
  subCategory: "Alimentos",
  price: "",
  stock: "",
  image: "",
  description: "",
};

const statusLabels: Record<string, string> = {
  received: "Recibido",
  preparing: "En preparación",
  on_the_way: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    setStatus("Cargando productos...");

    const response = await fetch("/api/products");
    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error || "No se pudieron cargar los productos.");
      setLoading(false);
      return;
    }

    setProducts(result.products || []);
    setStatus("Productos cargados.");
    setLoading(false);
  };

  const loadOrders = async () => {
  setLoading(true);
  setStatus("Cargando pedidos...");

  const response = await fetch("/api/admin/orders", {
    cache: "no-store",
  });

  const result = await response.json();

  if (!response.ok) {
    setStatus(result.error || "No se pudieron cargar los pedidos.");
    setLoading(false);
    return;
  }

  setOrders(result.orders || []);
  setStatus("Pedidos cargados.");
  setLoading(false);
};

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  const setField = (field: keyof typeof emptyForm, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const addProduct = async () => {
    if (!form.name || !form.price) {
      setStatus("El nombre y el precio son obligatorios.");
      return;
    }

    setStatus("Guardando producto...");

    const response = await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error || "No se pudo guardar el producto.");
      return;
    }

    setForm(emptyForm);
    setStatus("Producto agregado correctamente.");
    loadProducts();
  };

  const deleteProduct = async (id: number) => {
    const confirmed = confirm("¿Seguro que deseas eliminar este producto?");
    if (!confirmed) return;

    setStatus("Eliminando producto...");

    const response = await fetch(`/api/products/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error || "No se pudo eliminar el producto.");
      return;
    }

    setStatus("Producto eliminado.");
    loadProducts();
  };

 const updateOrderStatus = async (id: number, newStatus: string) => {
  setStatus("Actualizando pedido...");

  const response = await fetch(`/api/admin/orders/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: newStatus }),
  });

  const result = await response.json();

  if (!response.ok) {
    setStatus(result.error || "No se pudo actualizar el pedido.");
    return;
  }

  setOrders((currentOrders) =>
    currentOrders.map((order) =>
      order.id === id ? { ...order, status: newStatus } : order
    )
  );

  setStatus("Pedido actualizado.");
};

  return (
    <main className="min-h-screen bg-[#f7fbf5] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-10">
          <p className="font-black uppercase tracking-widest text-green-700">
            Administrador
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Panel de Soltal Pet Market
          </h1>

          <p className="mt-2 text-slate-600">
            Administra productos y revisa pedidos de la tienda.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex items-center gap-2 rounded-full px-6 py-3 font-black ${
                activeTab === "products"
                  ? "bg-green-700 text-white"
                  : "bg-green-50 text-green-800"
              }`}
            >
              <Package size={18} />
              Productos
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 rounded-full px-6 py-3 font-black ${
                activeTab === "orders"
                  ? "bg-green-700 text-white"
                  : "bg-green-50 text-green-800"
              }`}
            >
              <ShoppingBag size={18} />
              Pedidos
            </button>

            <button
              onClick={() => {
                loadProducts();
                loadOrders();
              }}
              className="ml-auto flex items-center gap-2 rounded-full bg-green-50 px-6 py-3 font-black text-green-800"
            >
              <RefreshCcw size={18} />
              Actualizar
            </button>
          </div>

          <p className="mt-5 text-sm font-bold text-slate-600">{status}</p>
        </div>

        {activeTab === "products" ? (
          <>
            <div className="mt-8 rounded-[2rem] bg-white p-6 shadow-sm md:p-10">
              <h2 className="text-2xl font-black">Agregar producto</h2>

              <div className="mt-6 grid gap-4 rounded-3xl bg-[#f7fbf5] p-5 md:grid-cols-2">
                <Input
                  label="Nombre del producto"
                  value={form.name}
                  onChange={(value) => setField("name", value)}
                />

                <div>
                  <label className="mb-2 block text-sm font-black">
                    Categoría
                  </label>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setField("category", event.target.value)
                    }
                    className="w-full rounded-2xl border border-green-100 bg-white px-4 py-3 outline-none"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Subcategoría"
                  value={form.subCategory}
                  onChange={(value) => setField("subCategory", value)}
                />

                <Input
                  label="Precio"
                  type="number"
                  value={form.price}
                  onChange={(value) => setField("price", value)}
                />

                <Input
                  label="Stock"
                  type="number"
                  value={form.stock}
                  onChange={(value) => setField("stock", value)}
                />

                <Input
                  label="URL de imagen"
                  value={form.image}
                  onChange={(value) => setField("image", value)}
                />

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-black">
                    Descripción
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setField("description", event.target.value)
                    }
                    rows={3}
                    placeholder="Descripción del producto"
                    className="w-full rounded-2xl border border-green-100 bg-white px-4 py-3 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    onClick={addProduct}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-700 px-6 py-4 font-black text-white hover:bg-green-800"
                  >
                    <Plus size={20} />
                    Agregar producto
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-sm">
              <div className="grid grid-cols-[80px_1fr_140px_120px_120px] gap-4 border-b border-green-100 bg-green-950 px-5 py-4 text-sm font-black text-white">
                <span>Imagen</span>
                <span>Producto</span>
                <span>Categoría</span>
                <span>Precio</span>
                <span>Acción</span>
              </div>

              {loading ? (
                <div className="p-8 text-center font-bold text-slate-500">
                  Cargando...
                </div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center font-bold text-slate-500">
                  No hay productos guardados.
                </div>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    className="grid grid-cols-[80px_1fr_140px_120px_120px] items-center gap-4 border-b border-green-50 px-5 py-4 text-sm"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />

                    <div>
                      <p className="font-black">{product.name}</p>
                      <p className="text-xs text-slate-500">
                        {product.description}
                      </p>
                      <p className="text-xs font-bold text-green-700">
                        Stock: {product.stock}
                      </p>
                    </div>

                    <span className="font-bold">{product.category}</span>

                    <span className="font-black text-green-700">
                      RD${Number(product.price).toLocaleString("es-DO")}
                    </span>

                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="flex items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-2 font-black text-red-600"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="mt-8 space-y-5">
            {loading ? (
              <div className="rounded-[2rem] bg-white p-8 text-center font-bold text-slate-500">
                Cargando pedidos...
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-[2rem] bg-white p-8 text-center font-bold text-slate-500">
                No hay pedidos guardados.
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-[2rem] bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row">
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-green-700">
                        Pedido #{order.id}
                      </p>

                      <h3 className="mt-1 text-2xl font-black">
                        {order.customer?.fullName || "Cliente sin nombre"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        {new Date(order.created_at).toLocaleString("es-DO")}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-2xl font-black text-green-700">
                        RD${Number(order.total).toLocaleString("es-DO")}
                      </p>

                      <select
                        value={order.status}
                        onChange={(event) =>
                          updateOrderStatus(order.id, event.target.value)
                        }
                        className="mt-3 rounded-2xl border border-green-100 bg-[#f7fbf5] px-4 py-3 font-black outline-none"
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <InfoBox title="Teléfono" value={order.customer?.phone} />
                    <InfoBox title="Correo" value={order.customer?.email} />
                    <InfoBox title="Ciudad" value={order.customer?.city} />
                    <InfoBox title="Sector" value={order.customer?.sector} />
                    <InfoBox title="Dirección" value={order.customer?.address} />
                    <InfoBox
                      title="Referencia"
                      value={order.customer?.reference}
                    />
                    <InfoBox title="Google Maps" value={order.customer?.mapsUrl} />
                  </div>

                  <div className="mt-6 rounded-3xl bg-[#f7fbf5] p-5">
                    <h4 className="font-black">Productos comprados</h4>

                    <div className="mt-4 space-y-3">
                      {order.items?.map((item, index) => (
                        <div
                          key={`${item.id}-${index}`}
                          className="flex justify-between rounded-2xl bg-white px-4 py-3 text-sm"
                        >
                          <span className="font-black">
                            {item.name} x{item.quantity}
                          </span>

                          <span className="font-black text-green-700">
                            RD$
                            {Number(item.price * item.quantity).toLocaleString(
                              "es-DO"
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        className="w-full rounded-2xl border border-green-100 bg-white px-4 py-3 outline-none"
      />
    </div>
  );
}

function InfoBox({ title, value }: { title: string; value?: string }) {
  return (
    <div className="rounded-2xl bg-[#f7fbf5] p-4">
      <p className="text-xs font-black uppercase tracking-widest text-green-700">
        {title}
      </p>
      <p className="mt-1 font-bold text-slate-700">{value || "No indicado"}</p>
    </div>
  );
}
