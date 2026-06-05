"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  PawPrint,
  Search,
  X,
  CreditCard,
  Truck,
  ShieldCheck,
  PackageSearch,
} from "lucide-react";
import { categories, type Product } from "@/data/products";
import type { CartItem, OrderForm } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";

const emptyForm: OrderForm = {
  fullName: "",
  phone: "",
  email: "",
  city: "",
  sector: "",
  reference: "",
  address: "",
  mapsUrl: "",
};

const animalSuggestions = [
  "Perros",
  "Gatos",
  "Caballos",
  "Vacas",
  "Cerdos",
  "Aves",
  "Conejos",
];

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

export default function Home() {
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [status, setStatus] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [lastOrderData, setLastOrderData] = useState<OrderStatusResult | null>(
    null
  );

  const [orderIdInput, setOrderIdInput] = useState("");
  const [orderPhoneInput, setOrderPhoneInput] = useState("");
  const [checkingOrder, setCheckingOrder] = useState(false);
  const [orderStatusMessage, setOrderStatusMessage] = useState("");
  const [orderStatusResult, setOrderStatusResult] =
    useState<OrderStatusResult | null>(null);
const [customerActionMessage, setCustomerActionMessage] = useState("");
const [customerActionLoading, setCustomerActionLoading] = useState(false);
const [showAddressEditor, setShowAddressEditor] = useState(false);
const [newAddress, setNewAddress] = useState("");
const [newSector, setNewSector] = useState("");
const [newReference, setNewReference] = useState("");
const [newMapsUrl, setNewMapsUrl] = useState("");
  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando productos:", error.message);
      setStatus("No se pudieron cargar los productos.");
      return;
    }

    const formattedProducts: Product[] = data.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      subCategory: product.sub_category,
      price: Number(product.price),
      stock: product.stock ?? 0,
      image: product.image,
      description: product.description,
    }));

    setProductsList(formattedProducts);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const quantity = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const filtered = useMemo(() => {
    const text = search.toLowerCase().trim();

    return productsList.filter((product) => {
      const matchCategory =
        category === "Todos" || product.category === category;

      const matchSearch =
        !text ||
        [product.name, product.category, product.subCategory].some((value) =>
          value.toLowerCase().includes(text)
        );

      return matchCategory && matchSearch;
    });
  }, [category, search, productsList]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      setStatus("Este producto está agotado.");
      return;
    }

    setCart((items) => {
      const found = items.find((item) => item.id === product.id);

      if (found) {
        if (found.quantity >= product.stock) {
          setStatus("No puedes agregar más unidades que el stock disponible.");
          return items;
        }

        return items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...items, { ...product, quantity: 1 }];
    });

    setStatus("Producto agregado al carrito.");
  };

  const removeFromCart = (id: number) => {
    setCart((items) => items.filter((item) => item.id !== id));
    setStatus("Producto eliminado del carrito.");
  };

  const decreaseQuantity = (id: number) => {
    setCart((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setStatus("Carrito vaciado.");
  };

  const validateCheckout = () => {
    if (cart.length === 0) {
      return "Agrega productos al carrito antes de crear el pedido.";
    }

    if (!form.fullName.trim()) {
      return "Escribe tu nombre completo.";
    }

    if (!form.phone.trim()) {
      return "Escribe tu número de teléfono.";
    }

    if (!form.city.trim()) {
      return "Escribe tu ciudad.";
    }

    if (!form.address.trim()) {
      return "Escribe tu dirección manual.";
    }

    return "";
  };

  const createOrder = async () => {
    const validationError = validateCheckout();

    if (validationError) {
      setStatus(validationError);
      return;
    }

    setCreatingOrder(true);
    setStatus("Creando pedido...");
    setLastOrderId(null);
    setLastOrderData(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          customer: form,
          items: cart,
          total,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus(result.error || "No se pudo crear el pedido.");
        return;
      }

      const newOrderId = result.order?.id || null;

      setLastOrderId(newOrderId);
      setLastOrderData(result.order || null);

      setStatus(
        newOrderId
          ? `Pedido creado correctamente. Tu número de pedido es: #${newOrderId}. Guarda ese número para consultar el estado.`
          : "Pedido creado correctamente. Guarda tus datos para consultar el estado."
      );

      setCart([]);
      setForm(emptyForm);
      await loadProducts();
    } catch (error) {
      setStatus("Ocurrió un error creando el pedido. Intenta de nuevo.");
    } finally {
      setCreatingOrder(false);
    }
  };

  const checkOrderStatus = async () => {
    if (!orderIdInput.trim()) {
      setOrderStatusMessage("Escribe el número de pedido.");
      return;
    }

    if (!orderPhoneInput.trim()) {
      setOrderStatusMessage("Escribe el teléfono usado en el pedido.");
      return;
    }

    setCheckingOrder(true);
    setOrderStatusMessage("Buscando pedido...");
    setOrderStatusResult(null);

    try {
      const response = await fetch("/api/order-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: orderIdInput,
          phone: orderPhoneInput,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setOrderStatusMessage(result.error || "No se pudo consultar el pedido.");
        return;
      }

      setOrderStatusResult(result.order);
      setOrderStatusMessage("Pedido encontrado.");
    } catch (error) {
      setOrderStatusMessage("Ocurrió un error consultando el pedido.");
    } finally {
      setCheckingOrder(false);
    }
  };
const canCustomerModifyOrder = (status: string) => {
  return status === "received" || status === "preparing";
};

const cancelCustomerOrder = async () => {
  if (!orderStatusResult) return;

  const confirmCancel = window.confirm(
    `¿Seguro que quieres cancelar el pedido #${orderStatusResult.id}?`
  );

  if (!confirmCancel) return;

  setCustomerActionLoading(true);
  setCustomerActionMessage("Cancelando pedido...");

  try {
    const response = await fetch("/api/customer-order-actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "cancel",
        orderId: orderStatusResult.id,
        phone: orderPhoneInput,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setCustomerActionMessage(result.error || "No se pudo cancelar el pedido.");
      return;
    }

    setOrderStatusResult(result.order);
    setCustomerActionMessage("Pedido cancelado correctamente.");
  } catch (error) {
    setCustomerActionMessage("Ocurrió un error cancelando el pedido.");
  } finally {
    setCustomerActionLoading(false);
  }
};

const updateCustomerAddress = async () => {
  if (!orderStatusResult) return;

  if (!newAddress.trim()) {
    setCustomerActionMessage("Escribe la nueva dirección.");
    return;
  }

  setCustomerActionLoading(true);
  setCustomerActionMessage("Actualizando dirección...");

  try {
    const response = await fetch("/api/customer-order-actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "update_address",
        orderId: orderStatusResult.id,
        phone: orderPhoneInput,
        address: newAddress,
        sector: newSector,
        reference: newReference,
        mapsUrl: newMapsUrl,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setCustomerActionMessage(
        result.error || "No se pudo actualizar la dirección."
      );
      return;
    }

    setOrderStatusResult(result.order);
    setCustomerActionMessage("Dirección actualizada correctamente.");
    setShowAddressEditor(false);
    setNewAddress("");
    setNewSector("");
    setNewReference("");
    setNewMapsUrl("");
  } catch (error) {
    setCustomerActionMessage("Ocurrió un error actualizando la dirección.");
  } finally {
    setCustomerActionLoading(false);
  }
};
  const openInvoice = (order: OrderStatusResult | null) => {
    if (!order) {
      setStatus("No hay pedido disponible para generar factura.");
      return;
    }

    const customer = order.customer || {};
    const items = order.items || [];

    const productsRows = items
      .map(
        (item) => `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>RD$${Number(item.price).toLocaleString("es-DO")}</td>
            <td>RD$${Number(item.price * item.quantity).toLocaleString(
              "es-DO"
            )}</td>
          </tr>
        `
      )
      .join("");

    const invoiceWindow = window.open("", "_blank");

    if (!invoiceWindow) {
      setStatus("No se pudo abrir la factura. Permite ventanas emergentes.");
      return;
    }

    invoiceWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura Pedido #${order.id} - Soltal Pet Market</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 40px;
              background: #f7fbf5;
            }

            .invoice {
              max-width: 900px;
              margin: auto;
              background: white;
              border-radius: 24px;
              padding: 32px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              border-bottom: 3px solid #15803d;
              padding-bottom: 20px;
              margin-bottom: 24px;
            }

            .brand {
              color: #15803d;
              font-size: 28px;
              font-weight: 900;
              margin: 0;
            }

            .subtitle {
              margin: 4px 0 0;
              color: #64748b;
            }

            .invoice-number {
              text-align: right;
            }

            .invoice-number h2 {
              margin: 0;
              font-size: 26px;
            }

            .status {
              display: inline-block;
              margin-top: 8px;
              padding: 8px 14px;
              border-radius: 999px;
              background: #dcfce7;
              color: #166534;
              font-weight: 800;
            }

            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 24px;
            }

            .box {
              background: #f7fbf5;
              padding: 18px;
              border-radius: 18px;
            }

            .box h3 {
              margin-top: 0;
              color: #15803d;
            }

            p {
              margin: 6px 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th {
              text-align: left;
              background: #14532d;
              color: white;
              padding: 12px;
            }

            td {
              padding: 12px;
              border-bottom: 1px solid #e2e8f0;
            }

            .total {
              margin-top: 24px;
              text-align: right;
              font-size: 28px;
              font-weight: 900;
              color: #15803d;
            }

            .footer {
              margin-top: 30px;
              color: #64748b;
              font-size: 14px;
              text-align: center;
            }

            .actions {
              margin-top: 24px;
              text-align: center;
            }

            button {
              border: 0;
              background: #15803d;
              color: white;
              padding: 14px 24px;
              border-radius: 999px;
              font-weight: 900;
              cursor: pointer;
            }

            @media print {
              body {
                background: white;
                padding: 0;
              }

              .invoice {
                box-shadow: none;
                border-radius: 0;
              }

              .actions {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="invoice">
            <div class="header">
              <div>
                <h1 class="brand">SOLTAL PET MARKET</h1>
                <p class="subtitle">Todo para tus animales en un solo lugar</p>
              </div>

              <div class="invoice-number">
                <h2>Factura #${order.id}</h2>
                <p>${new Date(order.created_at).toLocaleString("es-DO")}</p>
                <span class="status">${
                  statusLabels[order.status] || order.status
                }</span>
              </div>
            </div>

            <div class="grid">
              <div class="box">
                <h3>Datos del cliente</h3>
                <p><strong>Nombre:</strong> ${
                  customer.fullName || "No indicado"
                }</p>
                <p><strong>Teléfono:</strong> ${
                  customer.phone || "No indicado"
                }</p>
                <p><strong>Correo:</strong> ${
                  customer.email || "No indicado"
                }</p>
                <p><strong>Ciudad:</strong> ${
                  customer.city || "No indicado"
                }</p>
              </div>

              <div class="box">
                <h3>Dirección de entrega</h3>
                <p><strong>Sector:</strong> ${
                  customer.sector || "No indicado"
                }</p>
                <p><strong>Dirección:</strong> ${
                  customer.address || "No indicado"
                }</p>
                <p><strong>Referencia:</strong> ${
                  customer.reference || "No indicado"
                }</p>
                <p><strong>Google Maps:</strong> ${
                  customer.mapsUrl || "No indicado"
                }</p>
              </div>
            </div>

            <h3>Productos comprados</h3>

            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${productsRows}
              </tbody>
            </table>

            <div class="total">
              Total: RD$${Number(order.total).toLocaleString("es-DO")}
            </div>

            <div class="footer">
              Gracias por comprar en Soltal Pet Market.
            </div>

            <div class="actions">
              <button onclick="window.print()">Imprimir / Guardar como PDF</button>
            </div>
          </div>
        </body>
      </html>
    `);

    invoiceWindow.document.close();
  };

  const setField = (field: keyof OrderForm, value: string) => {
    setForm({ ...form, [field]: value });
  };

  return (
    <main className="min-h-screen bg-[#f7fbf5] text-slate-900">
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <button
            onClick={() => {
              setSelected(null);
              setCategory("Todos");
              setSearch("");
            }}
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-700 text-white">
              <PawPrint />
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-xl font-black text-green-800">SOLTAL PET</p>
              <p className="font-black text-lime-600">MARKET</p>
            </div>
          </button>

          <div className="flex items-center gap-2 md:gap-3">
           <a
  href="/mi-cuenta"
  className="rounded-full bg-green-700 px-4 py-3 text-sm font-black text-white md:px-5 md:text-base"
>
  Mi cuenta
</a>

            <a
              href="#consultar-pedido"
              className="hidden rounded-full bg-green-50 px-5 py-3 font-black text-green-800 md:block"
            >
              Consultar pedido
            </a>

            <a
              href="#carrito"
              className="flex items-center gap-2 rounded-full bg-green-700 px-4 py-3 text-sm font-black text-white md:px-5 md:text-base"
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Ir al carrito</span>
              {quantity > 0 && (
                <span className="rounded-full bg-white px-2 text-green-700">
                  {quantity}
                </span>
              )}
            </a>
          </div>
        </div>
      </header>

     <section className="relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-green-950 via-green-800 to-lime-500" />

  <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-lime-300/20 blur-3xl" />
  <div className="absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-white/20 blur-3xl" />

  <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-2 md:items-center">
    <div className="animate-fade-up text-white">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 text-sm font-black backdrop-blur">
        <PawPrint size={18} />
        Tienda online para mascotas y animales
      </div>

      <h1 className="mt-6 text-5xl font-black leading-tight md:text-6xl">
        Todo para tus animales, rápido, fácil y seguro.
      </h1>

      <p className="mt-6 max-w-xl text-lg leading-8 text-white/85">
        Compra alimentos, cuidado, accesorios y productos esenciales para tus
        mascotas. Haz tu pedido online, recibe factura por correo y consulta el
        estado cuando quieras.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href="#productos"
          className="premium-button rounded-full bg-lime-300 px-8 py-4 font-black text-green-950"
        >
          Comprar ahora
        </a>

        <a
          href="/mi-cuenta"
          className="rounded-full bg-white/15 px-8 py-4 font-black text-white backdrop-blur transition hover:bg-white/25"
        >
          Mi cuenta
        </a>

        <a
          href="#consultar-pedido"
          className="rounded-full bg-white px-8 py-4 font-black text-green-800 transition hover:bg-green-50"
        >
          Consultar pedido
        </a>
      </div>

      <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
        <div className="rounded-3xl bg-white/12 p-4 backdrop-blur">
          <p className="text-2xl font-black">24/7</p>
          <p className="mt-1 text-sm text-white/75">Pedidos online</p>
        </div>

        <div className="rounded-3xl bg-white/12 p-4 backdrop-blur">
          <p className="text-2xl font-black">RD$</p>
          <p className="mt-1 text-sm text-white/75">Precios claros</p>
        </div>

        <div className="rounded-3xl bg-white/12 p-4 backdrop-blur">
          <p className="text-2xl font-black">PDF</p>
          <p className="mt-1 text-sm text-white/75">Factura digital</p>
        </div>
      </div>
    </div>

    <div className="animate-soft-float">
      <div className="glass-card rounded-[2.5rem] p-6 shadow-2xl">
        <div className="rounded-[2rem] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black uppercase tracking-widest text-green-700">
                Soltal Pet Market
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">
                Compra inteligente
              </h2>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-700 text-white">
              <PawPrint />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            {[
              "Alimentos",
              "Accesorios",
              "Cuidado",
              "Antipulgas",
              "Juguetes",
              "Higiene",
            ].map((item) => (
              <div
                key={item}
                className="premium-card rounded-3xl bg-[#f7fbf5] p-5 text-center"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-green-950">
                  <PawPrint size={22} />
                </div>

                <p className="font-black text-slate-800">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-green-950 p-5 text-white">
            <p className="text-sm font-bold text-white/70">
              Estado de pedidos
            </p>
            <p className="mt-1 text-2xl font-black">
              Recibido → En camino → Entregado
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
    <section className="relative z-10 mx-auto -mt-10 grid max-w-7xl gap-4 px-4 pb-10 md:grid-cols-3">
  <Info
    icon={<CreditCard />}
    title="Compra simple"
    text="Haz tu pedido online con datos claros y recibe tu factura por correo."
  />

  <Info
    icon={<Truck />}
    title="Entrega organizada"
    text="El pedido queda con dirección, referencia y estado para seguimiento."
  />

  <Info
    icon={<ShieldCheck />}
    title="Cuenta del cliente"
    text="Inicia sesión con Google y revisa tus pedidos desde Mi cuenta."
  />
</section>
      {status && (
        <section className="mx-auto max-w-7xl px-4">
          <div className="rounded-3xl bg-white p-4 text-sm font-bold text-slate-700 shadow-sm">
            {status}

            {lastOrderId && (
              <div className="mt-2 rounded-2xl bg-green-50 p-3 text-green-800">
                Tu número de pedido es{" "}
                <span className="font-black">#{lastOrderId}</span>. Guárdalo
                junto con tu teléfono para consultar el estado.

                <div>
                  <button
                    onClick={() => openInvoice(lastOrderData)}
                    className="mt-3 rounded-full bg-green-700 px-5 py-3 font-black text-white"
                  >
                    Ver factura del pedido
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

     <section id="productos" className="mx-auto max-w-7xl px-4 py-16">
  <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
    <div className="animate-fade-up">
      <p className="font-black uppercase tracking-widest text-green-700">
        Catálogo
      </p>

      <h2 className="mt-2 text-4xl font-black text-slate-950 md:text-5xl">
        Productos para tus animales
      </h2>

      <p className="mt-4 max-w-2xl text-slate-600">
        Busca por nombre, categoría o tipo de animal. Los productos agotados se
        muestran claramente para evitar pedidos incorrectos.
      </p>
    </div>

    <div className="relative w-full max-w-md rounded-full border border-green-100 bg-white px-5 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Search size={18} className="text-green-700" />

        <input
          value={search}
          onFocus={() => setShowSuggestions(true)}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar productos..."
          className="w-full bg-transparent outline-none"
        />

        {search && (
          <button
            onClick={() => setSearch("")}
            className="rounded-full bg-green-50 p-2 text-green-800"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-16 z-20 rounded-3xl border border-green-100 bg-white p-3 shadow-xl">
          {animalSuggestions.map((animal) => (
            <button
              key={animal}
              onMouseDown={() => {
                setCategory(animal);
                setSearch(animal);
                setShowSuggestions(false);
              }}
              className="mr-2 mt-2 rounded-full bg-green-50 px-4 py-2 font-bold text-green-800 transition hover:bg-green-100"
            >
              {animal}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>

  <div className="mt-8 flex flex-wrap gap-3">
    <button
      onClick={() => {
        setCategory("Todos");
        setSelected(null);
      }}
      className={`premium-button rounded-full px-5 py-3 font-black ${
        category === "Todos"
          ? "bg-green-700 text-white"
          : "bg-white text-green-800"
      }`}
    >
      Todos
    </button>

    {categories.map((item) => (
      <button
        key={item}
        onClick={() => {
          setCategory(item);
          setSelected(null);
        }}
        className={`premium-button rounded-full px-5 py-3 font-black ${
          category === item
            ? "bg-green-700 text-white"
            : "bg-white text-green-800"
        }`}
      >
        {item}
      </button>
    ))}
  </div>

        {selected ? (
          <section className="mt-8 rounded-[2rem] bg-white p-6">
            <button
              onClick={() => setSelected(null)}
              className="rounded-full bg-green-50 px-5 py-2 font-black text-green-800"
            >
              Volver
            </button>

            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <img
                src={selected.image}
                alt={selected.name}
                className="h-96 w-full rounded-[2rem] object-cover"
              />

              <div>
                <p className="font-black text-green-700">
                  {selected.category} • {selected.subCategory}
                </p>

                <h2 className="mt-2 text-4xl font-black">{selected.name}</h2>

                <p className="mt-4 text-slate-600">{selected.description}</p>

                <p className="mt-6 text-4xl font-black text-green-700">
                  RD${selected.price.toLocaleString("es-DO")}
                </p>

                <p className="mt-3 font-bold">
                  Stock: {selected.stock > 0 ? selected.stock : "Agotado"}
                </p>

                <button
                  onClick={() => addToCart(selected)}
                  disabled={selected.stock <= 0}
                  className={`mt-6 rounded-2xl px-8 py-4 font-black ${
                    selected.stock <= 0
                      ? "cursor-not-allowed bg-slate-300 text-slate-600"
                      : "bg-green-700 text-white hover:bg-green-800"
                  }`}
                >
                  {selected.stock <= 0 ? "Agotado" : "Agregar al carrito"}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpen={setSelected}
                onAdd={addToCart}
              />
            ))}
          </div>
        )}
      </section>

    <section id="carrito" className="mx-auto max-w-7xl px-4 py-16">
    <div className="premium-card rounded-[2.5rem] border border-green-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <h2 className="text-4xl font-black">Carrito</h2>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="rounded-full bg-red-50 px-5 py-3 font-black text-red-600 hover:bg-red-100"
              >
                Vaciar carrito
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="mt-6 text-slate-600">Tu carrito está vacío.</p>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-3xl bg-[#f7fbf5] p-4 md:flex-row md:items-center"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-20 w-20 rounded-2xl object-cover"
                    />

                    <div className="flex-1">
                      <p className="font-black">{item.name}</p>
                      <p className="text-green-700">
                        RD${item.price.toLocaleString("es-DO")}
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        Stock disponible: {item.stock}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => decreaseQuantity(item.id)}
                        className="rounded-full bg-white px-4 py-2 font-black"
                      >
                        −
                      </button>

                      <span className="font-black">{item.quantity}</span>

                      <button
                        onClick={() => addToCart(item)}
                        className="rounded-full bg-white px-4 py-2 font-black"
                      >
                        +
                      </button>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="font-black text-red-600"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            <div className="rounded-[2rem] bg-gradient-to-br from-green-950 to-green-800 p-6 text-white shadow-xl">
                <h3 className="text-2xl font-black">Resumen</h3>

                <p className="mt-4">Productos: {quantity}</p>

                <p className="mt-2 text-2xl font-black">
                  Total: RD${total.toLocaleString("es-DO")}
                </p>

             <a
  href="#pago"
  className="premium-button mt-6 block rounded-2xl bg-lime-300 py-4 text-center font-black text-green-950"
>
  Proceder al pago
</a>
              </div>
            </div>
          )}
        </div>
      </section>

<section id="pago" className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-[2rem] bg-white p-6">
          <h2 className="text-4xl font-black">Finalizar compra</h2>

          <p className="mt-2 text-sm font-bold text-slate-500">
            Los campos marcados con * son obligatorios.
          </p>
          <div className="mt-4 rounded-3xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-900">
  Puedes comprar sin cuenta. Pero si inicias sesión con Google, podrás ver tu
  historial de pedidos automáticamente en Mi cuenta.
</div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nombre completo *"
                value={form.fullName}
                onChange={(value) => setField("fullName", value)}
              />

              <Input
                label="Teléfono *"
                value={form.phone}
                onChange={(value) => setField("phone", value)}
              />

              <Input
                label="Correo"
                value={form.email}
                onChange={(value) => setField("email", value)}
              />

              <Input
                label="Ciudad *"
                value={form.city}
                onChange={(value) => setField("city", value)}
              />

              <Input
                label="Sector"
                value={form.sector}
                onChange={(value) => setField("sector", value)}
              />

              <Input
                label="Referencia"
                value={form.reference}
                onChange={(value) => setField("reference", value)}
              />

              <Input
                label="Dirección manual *"
                value={form.address}
                onChange={(value) => setField("address", value)}
                full
              />

              <Input
                label="Link de Google Maps"
                value={form.mapsUrl}
                onChange={(value) => setField("mapsUrl", value)}
                full
              />
            </div>

    <div className="rounded-[2rem] bg-gradient-to-br from-green-950 to-green-800 p-6 text-white shadow-xl">
              <p className="text-2xl font-black">
                Total: RD${total.toLocaleString("es-DO")}
              </p>

              <button
                onClick={createOrder}
                disabled={creatingOrder || cart.length === 0}
                className={`mt-6 w-full rounded-2xl py-4 font-black text-green-950 ${
                  creatingOrder || cart.length === 0
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-lime-400 hover:bg-lime-300"
                }`}
              >
                {creatingOrder ? "Creando pedido..." : "Crear pedido y pagar"}
              </button>

              {status && <p className="mt-4 text-sm">{status}</p>}
            </div>
          </div>
        </div>
      </section>

      <section id="consultar-pedido" className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-green-700 p-3 text-white">
              <PackageSearch size={24} />
            </div>

            <div>
              <p className="font-black uppercase text-green-700">
                Estado del pedido
              </p>
              <h2 className="text-4xl font-black">Consultar pedido</h2>
            </div>
          </div>

          <p className="mt-4 text-slate-600">
            Escribe tu número de pedido y el teléfono usado al comprar.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_220px]">
            <Input
              label="Número de pedido"
              value={orderIdInput}
              onChange={setOrderIdInput}
            />

            <Input
              label="Teléfono"
              value={orderPhoneInput}
              onChange={setOrderPhoneInput}
            />

            <div className="flex items-end">
              <button
                onClick={checkOrderStatus}
                disabled={checkingOrder}
                className="w-full rounded-2xl bg-green-700 px-6 py-3 font-black text-white hover:bg-green-800 disabled:bg-slate-300"
              >
                {checkingOrder ? "Buscando..." : "Consultar"}
              </button>
            </div>
          </div>

          {orderStatusMessage && (
            <p className="mt-5 text-sm font-bold text-slate-600">
              {orderStatusMessage}
            </p>
          )}

          {orderStatusResult && (
            <div className="mt-6 rounded-3xl bg-[#f7fbf5] p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div>
                  <p className="font-black text-green-700">
                    Pedido #{orderStatusResult.id}
                  </p>

                  <h3 className="mt-1 text-2xl font-black">
                    Estado:{" "}
                    {statusLabels[orderStatusResult.status] ||
                      orderStatusResult.status}
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    Fecha:{" "}
                    {new Date(orderStatusResult.created_at).toLocaleString(
                      "es-DO"
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <p className="text-sm font-bold text-slate-500">Total</p>

                  <p className="text-2xl font-black text-green-700">
                    RD${Number(orderStatusResult.total).toLocaleString("es-DO")}
                  </p>

                  <button
                    onClick={() => openInvoice(orderStatusResult)}
                    className="mt-4 rounded-full bg-green-700 px-5 py-3 font-black text-white"
                  >
                    Ver factura / guardar PDF
                  </button>
                  {canCustomerModifyOrder(orderStatusResult.status) ? (
  <div className="mt-4 space-y-3">
    <button
      onClick={() => {
        setShowAddressEditor(!showAddressEditor);
        setNewAddress(orderStatusResult.customer?.address || "");
        setNewSector(orderStatusResult.customer?.sector || "");
        setNewReference(orderStatusResult.customer?.reference || "");
        setNewMapsUrl(orderStatusResult.customer?.mapsUrl || "");
      }}
      disabled={customerActionLoading}
      className="w-full rounded-full bg-lime-300 px-5 py-3 font-black text-green-950 disabled:bg-slate-300"
    >
      Cambiar dirección
    </button>

    <button
      onClick={cancelCustomerOrder}
      disabled={customerActionLoading}
      className="w-full rounded-full bg-red-50 px-5 py-3 font-black text-red-600 hover:bg-red-100 disabled:bg-slate-300"
    >
      Cancelar pedido
    </button>
  </div>
   {showAddressEditor && canCustomerModifyOrder(orderStatusResult.status) && (
  <div className="mt-5 rounded-3xl bg-white p-5">
    <h4 className="text-xl font-black">Cambiar dirección de envío</h4>

    <p className="mt-2 text-sm font-bold text-slate-500">
      Solo puedes cambiar la dirección antes de que el pedido esté en camino.
    </p>

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Input
        label="Nueva dirección *"
        value={newAddress}
        onChange={setNewAddress}
        full
      />

      <Input
        label="Sector"
        value={newSector}
        onChange={setNewSector}
      />

      <Input
        label="Referencia"
        value={newReference}
        onChange={setNewReference}
      />

      <Input
        label="Link de Google Maps"
        value={newMapsUrl}
        onChange={setNewMapsUrl}
        full
      />
    </div>

    <div className="mt-5 flex flex-wrap gap-3">
      <button
        onClick={updateCustomerAddress}
        disabled={customerActionLoading}
        className="rounded-full bg-green-700 px-6 py-3 font-black text-white disabled:bg-slate-300"
      >
        Guardar nueva dirección
      </button>

      <button
        onClick={() => setShowAddressEditor(false)}
        disabled={customerActionLoading}
        className="rounded-full bg-slate-100 px-6 py-3 font-black text-slate-700"
      >
        Cancelar edición
      </button>
    </div>
  </div>
)}
  {customerActionMessage && (
  <p className="mt-4 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-800">
    {customerActionMessage}
  </p>
)}                
  <div className="mt-5 rounded-3xl bg-white p-5">
    <h4 className="text-xl font-black">Cambiar dirección de envío</h4>

    <p className="mt-2 text-sm font-bold text-slate-500">
      Solo puedes cambiar la dirección antes de que el pedido esté en camino.
    </p>

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Input
        label="Nueva dirección *"
        value={newAddress}
        onChange={setNewAddress}
        full
      />

      <Input
        label="Sector"
        value={newSector}
        onChange={setNewSector}
      />

      <Input
        label="Referencia"
        value={newReference}
        onChange={setNewReference}
      />

      <Input
        label="Link de Google Maps"
        value={newMapsUrl}
        onChange={setNewMapsUrl}
        full
      />
    </div>

    <div className="mt-5 flex flex-wrap gap-3">
      <button
        onClick={updateCustomerAddress}
        disabled={customerActionLoading}
        className="rounded-full bg-green-700 px-6 py-3 font-black text-white disabled:bg-slate-300"
      >
        Guardar nueva dirección
      </button>

      <button
        onClick={() => setShowAddressEditor(false)}
        disabled={customerActionLoading}
        className="rounded-full bg-slate-100 px-6 py-3 font-black text-slate-700"
      >
        Cancelar edición
      </button>
    </div>
  </div>
)}          
) : (
  <p className="mt-4 rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-600">
    Este pedido ya no puede modificarse porque está en camino, entregado o cancelado.
  </p>
)}
                </div>
              </div>

              <div className="mt-5">
                <h4 className="font-black">Productos</h4>

                <div className="mt-3 space-y-3">
                  {orderStatusResult.items?.map((item, index) => (
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
          )}
        </div>
      </section>
    </main>
  );
}

function Info({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="premium-card rounded-[2rem] border border-green-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-700 text-white">
        {icon}
      </div>

      <h3 className="text-xl font-black text-slate-950">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
function Input({
  label,
  value,
  onChange,
  full = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="mb-2 block text-sm font-black">{label}</label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        className="w-full rounded-2xl border border-green-100 bg-[#f7fbf5] px-4 py-3 outline-none"
      />
    </div>
  );
}
