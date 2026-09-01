import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RequestedItem = {
  id: number;
  quantity: number;
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const rawItems = (body as { items?: unknown })?.items;

  if (!Array.isArray(rawItems)) {
    return NextResponse.json({ error: "Carrito no válido." }, { status: 400 });
  }

  const items: RequestedItem[] = rawItems
    .map((item: any) => ({
      id: Number(item?.id),
      quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
    }))
    .filter((item) => Number.isSafeInteger(item.id) && item.id > 0);

  const ids = Array.from(new Set(items.map((item) => item.id)));

  if (ids.length === 0) {
    return NextResponse.json({ items: [], changes: [] });
  }

  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("id, name, category, sub_category, price, stock, image, description")
    .in("id", ids);

  if (error) {
    return NextResponse.json(
      { error: "No se pudo actualizar el carrito." },
      { status: 500 }
    );
  }

  const productsById = new Map((products || []).map((product) => [product.id, product]));
  const changes: string[] = [];
  const syncedItems = items.flatMap((requested) => {
    const product = productsById.get(requested.id);

    if (!product) {
      changes.push("Se eliminó un producto que ya no está disponible.");
      return [];
    }

    const stock = Math.max(0, Number(product.stock || 0));

    if (stock === 0) {
      changes.push(`${product.name} se eliminó porque está agotado.`);
      return [];
    }

    const quantity = Math.min(requested.quantity, stock);

    if (quantity !== requested.quantity) {
      changes.push(`La cantidad de ${product.name} se ajustó a ${quantity}.`);
    }

    const original = rawItems.find((item: any) => Number(item?.id) === requested.id) as any;
    if (Number(original?.price) !== Number(product.price)) {
      changes.push(`El precio de ${product.name} fue actualizado.`);
    }

    return [{
      id: product.id,
      name: product.name,
      category: product.category,
      subCategory: product.sub_category,
      price: Number(product.price),
      stock,
      image: product.image || "",
      description: product.description || "",
      quantity,
    }];
  });

  return NextResponse.json(
    { items: syncedItems, changes: Array.from(new Set(changes)) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
