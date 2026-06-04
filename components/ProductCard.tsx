import { Eye, ShoppingCart, PackageX } from "lucide-react";
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
  const isOutOfStock = Number(product.stock) <= 0;

  return (
    <div className="premium-card group overflow-hidden rounded-[2rem] bg-white shadow-sm">
      <button
        onClick={() => onOpen(product)}
        className="relative block h-56 w-full overflow-hidden bg-green-50"
      >
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-80" />

        <div className="absolute left-4 top-4">
          <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-black text-green-800 shadow-sm">
            {product.category}
          </span>
        </div>

        <div className="absolute bottom-4 right-4">
          <span
            className={`rounded-full px-4 py-2 text-xs font-black shadow-sm ${
              isOutOfStock
                ? "bg-red-100 text-red-700"
                : "bg-lime-300 text-green-950"
            }`}
          >
            {isOutOfStock ? "Agotado" : `Stock: ${product.stock}`}
          </span>
        </div>
      </button>

      <div className="p-5">
        <p className="text-xs font-black uppercase tracking-widest text-green-700">
          {product.subCategory}
        </p>

        <button
          onClick={() => onOpen(product)}
          className="mt-2 text-left"
        >
          <h3 className="line-clamp-2 text-xl font-black text-slate-950 transition group-hover:text-green-700">
            {product.name}
          </h3>
        </button>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
          {product.description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-2xl font-black text-green-700">
            RD${Number(product.price).toLocaleString("es-DO")}
          </p>

          <button
            onClick={() => onOpen(product)}
            className="rounded-full bg-green-50 p-3 text-green-800 transition hover:bg-green-100"
            title="Ver detalles"
          >
            <Eye size={18} />
          </button>
        </div>

        <button
          onClick={() => onAdd(product)}
          disabled={isOutOfStock}
          className={`premium-button mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black ${
            isOutOfStock
              ? "cursor-not-allowed bg-slate-200 text-slate-500"
              : "bg-green-700 text-white hover:bg-green-800"
          }`}
        >
          {isOutOfStock ? (
            <>
              <PackageX size={18} />
              Agotado
            </>
          ) : (
            <>
              <ShoppingCart size={18} />
              Agregar al carrito
            </>
          )}
        </button>
      </div>
    </div>
  );
}
