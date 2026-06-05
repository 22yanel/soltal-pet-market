"use client";

import { useEffect, useState } from "react";
import { LogOut, PawPrint, ShoppingBag, ReceiptText } from "lucide-react";
import { supabase } from "@/lib/supabase";

type UserData = {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
};

type AccountOrder = {
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
  items: {
    id: number;
    name: string;
    price: number;
    quantity: number;
  }[];
  total: number;
  status: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  received: "Recibido",
  preparing: "En preparación",
  on_the_way: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export default function MyAccountPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  const [newAddress, setNewAddress] = useState("");
  const [newSector, setNewSector] = useState("");
  const [newReference, setNewReference] = useState("");
  const [newMapsUrl, setNewMapsUrl] = useState("");

  const canCustomerModifyOrder = (orderStatus: string) => {
    return orderStatus === "received" || orderStatus === "preparing";
  };

  const loadOrders = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setOrders([]);
      return;
    }

    const response = await fetch("/api/account/orders", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error || "No se pudieron cargar tus pedidos.");
      return;
    }

    setOrders(result.orders || []);
  };

  const loadUser = async () => {
    setLoading(true);

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      setUser(null);
      setOrders([]);
      setLoading(false);
      return;
    }

    setUser({
      id: data.user.id,
      email: data.user.email || "",
      name:
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        "Cliente",
      avatar: data.user.user_metadata?.avatar_url || "",
    });

    await loadOrders();
    setLoading(false);
  };

  useEffect(() => {
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/?from=logout";
  };

  const cancelOrderFromAccount = async (order: AccountOrder) => {
    const confirmCancel = window.confirm(
      `¿Seguro que quieres cancelar el pedido #${order.id}?`
    );

    if (!confirmCancel) return;

    setActionLoading(true);
    setActionMessage(`Cancelando pedido #${order.id}...`);

    try {
      const response = await fetch("/api/customer-order-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancel",
          orderId: order.id,
          phone: order.customer?.phone || "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setActionMessage(result.error || "No se pudo cancelar el pedido.");
        return;
      }

      setActionMessage(`Pedido #${order.id} cancelado correctamente.`);
      await loadOrders();
    } catch (error) {
      setActionMessage("Ocurrió un error cancelando el pedido.");
    } finally {
      setActionLoading(false);
    }
  };

  const startEditingAddress = (order: AccountOrder) => {
    setEditingOrderId(order.id);
    setNewAddress(order.customer?.address || "");
    setNewSector(order.customer?.sector || "");
    setNewReference(order.customer?.reference || "");
    setNewMapsUrl(order.customer?.mapsUrl || "");
    setActionMessage("");
  };

  const updateAddressFromAccount = async (order: AccountOrder) => {
    if (!newAddress.trim()) {
      setActionMessage("Escribe la nueva dirección.");
      return;
    }

    setActionLoading(true);
    setActionMessage(`Actualizando dirección del pedido #${order.id}...`);

    try {
      const response = await fetch("/api/customer-order-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_address",
          orderId: order.id,
          phone: order.customer?.phone || "",
          address: newAddress,
          sector: newSector,
          reference: newReference,
          mapsUrl: newMapsUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setActionMessage(
          result.error || "No se pudo actualizar la dirección."
        );
        return;
      }

      setActionMessage(`Dirección del pedido #${order.id} actualizada.`);
      setEditingOrderId(null);
      setNewAddress("");
      setNewSector("");
      setNewReference("");
      setNewMapsUrl("");

      await loadOrders();
    } catch (error) {
      setActionMessage("Ocurrió un error actualizando la dirección.");
    } finally {
      setActionLoading(false);
    }
  };

  const openInvoice = (order: AccountOrder) => {
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
      setActionMessage("No se pudo abrir la factura. Permite ventanas emergentes.");
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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7fbf5] p-6 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-[2rem] bg-white p-8">
          <p className="font-black text-slate-600">Cargando cuenta...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#f7fbf5] p-6 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-[2rem] bg-white p-8">
          <h1 className="text-4xl font-black">Mi cuenta</h1>

          <p className="mt-3 text-slate-600">
            Debes iniciar sesión para ver esta página.
          </p>

          <a
            href="/login"
            className="mt-6 inline-block rounded-full bg-green-700 px-6 py-3 font-black text-white"
          >
            Iniciar sesión
          </a>

          <a
            href="/?from=account"
            className="ml-3 mt-6 inline-block rounded-full bg-green-50 px-6 py-3 font-black text-green-800"
          >
            Volver a la tienda
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7fbf5] p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-700 text-white">
                  <PawPrint />
                </div>
              )}

              <div>
                <p className="font-black uppercase tracking-widest text-green-700">
                  Mi cuenta
                </p>
                <h1 className="text-3xl font-black">{user.name}</h1>
                <p className="text-slate-600">{user.email}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 rounded-full bg-red-50 px-5 py-3 font-black text-red-600 hover:bg-red-100"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-green-700 p-3 text-white">
              <ShoppingBag />
            </div>

            <div>
              <p className="font-black uppercase text-green-700">Pedidos</p>
              <h2 className="text-3xl font-black">Mis pedidos</h2>
            </div>
          </div>

          {status && (
            <p className="mt-5 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-800">
              {status}
            </p>
          )}

          {actionMessage && (
            <p className="mt-5 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-800">
              {actionMessage}
            </p>
          )}

          {orders.length === 0 ? (
            <div className="mt-6 rounded-3xl bg-[#f7fbf5] p-6">
              <p className="font-bold text-slate-600">
                Todavía no tienes pedidos conectados a esta cuenta.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Los pedidos nuevos que hagas mientras estés logueado aparecerán
                aquí.
              </p>

              <a
                href="/?from=account"
                className="mt-5 inline-block rounded-full bg-green-700 px-6 py-3 font-black text-white"
              >
                Ir a comprar
              </a>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {orders.map((order) => (
                <div key={order.id} className="rounded-3xl bg-[#f7fbf5] p-6">
                  <div className="flex flex-col justify-between gap-4 md:flex-row">
                    <div>
                      <p className="font-black text-green-700">
                        Pedido #{order.id}
                      </p>

                      <h3 className="mt-1 text-2xl font-black">
                        {statusLabels[order.status] || order.status}
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        {new Date(order.created_at).toLocaleString("es-DO")}
                      </p>

                      <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-700">
                        <p className="font-black text-green-700">
                          Dirección actual
                        </p>

                        <p className="mt-2">
                          <strong>Dirección:</strong>{" "}
                          {order.customer?.address || "No indicada"}
                        </p>

                        <p>
                          <strong>Sector:</strong>{" "}
                          {order.customer?.sector || "No indicado"}
                        </p>

                        <p>
                          <strong>Referencia:</strong>{" "}
                          {order.customer?.reference || "No indicada"}
                        </p>
                      </div>
                    </div>

                    <div className="md:min-w-[280px] md:text-right">
                      <p className="text-2xl font-black text-green-700">
                        RD${Number(order.total).toLocaleString("es-DO")}
                      </p>

                      <button
                        onClick={() => openInvoice(order)}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-green-700 px-5 py-3 font-black text-white"
                      >
                        <ReceiptText size={18} />
                        Ver factura
                      </button>

                      {canCustomerModifyOrder(order.status) ? (
                        <div className="mt-3 space-y-3">
                          <button
                            onClick={() => startEditingAddress(order)}
                            disabled={actionLoading}
                            className="w-full rounded-full bg-lime-300 px-5 py-3 font-black text-green-950 disabled:bg-slate-300"
                          >
                            Cambiar dirección
                          </button>

                          <button
                            onClick={() => cancelOrderFromAccount(order)}
                            disabled={actionLoading}
                            className="w-full rounded-full bg-red-50 px-5 py-3 font-black text-red-600 hover:bg-red-100 disabled:bg-slate-300"
                          >
                            Cancelar pedido
                          </button>
                        </div>
                      ) : (
                        <p className="mt-4 rounded-2xl bg-slate-100 p-3 text-left text-sm font-bold text-slate-600">
                          Este pedido ya no puede modificarse porque está en
                          camino, entregado o cancelado.
                        </p>
                      )}
                    </div>
                  </div>

                  {editingOrderId === order.id &&
                    canCustomerModifyOrder(order.status) && (
                      <div className="mt-5 rounded-3xl bg-white p-5">
                        <h4 className="text-xl font-black">
                          Cambiar dirección de envío
                        </h4>

                        <p className="mt-2 text-sm font-bold text-slate-500">
                          Solo puedes cambiar la dirección antes de que el
                          pedido esté en camino.
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
                            onClick={() => updateAddressFromAccount(order)}
                            disabled={actionLoading}
                            className="rounded-full bg-green-700 px-6 py-3 font-black text-white disabled:bg-slate-300"
                          >
                            Guardar nueva dirección
                          </button>

                          <button
                            onClick={() => setEditingOrderId(null)}
                            disabled={actionLoading}
                            className="rounded-full bg-slate-100 px-6 py-3 font-black text-slate-700"
                          >
                            Cancelar edición
                          </button>
                        </div>
                      </div>
                    )}

                  <div className="mt-5 space-y-3">
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
              ))}
            </div>
          )}
        </div>

        <a
          href="/?from=account"
          className="mt-6 inline-block rounded-full bg-green-50 px-6 py-3 font-black text-green-800"
        >
          Volver a la tienda
        </a>
      </div>
    </main>
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
