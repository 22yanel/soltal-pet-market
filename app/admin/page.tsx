"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCcw } from "lucide-react";

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

export default function AdminPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
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

  useEffect(() => {
    loadProducts();
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
            Agrega productos reales a la tienda. Todo lo que guardes aquí se
            guarda en Supabase.
          </p>

          <div className="mt-8 grid gap-4 rounded-3xl bg-[#f7fbf5] p-5 md:grid-cols-2">
            <Input
              label="Nombre del producto"
              value={form.name}
              onChange={(value) => setField("name", value)}
            />

            <div>
              <label className="mb-2 block text-sm font-black">Categoría</label>
              <select
                value={form.category}
                onChange={(event) => setField("category", event.target.value)}
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

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-slate-600">{status}</p>

            <button
              onClick={loadProducts}
              className="flex items-center gap-2 rounded-full bg-green-50 px-5 py-3 font-black text-green-800"
            >
              <RefreshCcw size={18} />
              Actualizar
            </button>
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
