import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No se recibió ninguna imagen." },
      { status: 400 }
    );
  }

  const fileExtension = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${fileExtension}`;

  const { error } = await supabaseAdmin.storage
    .from("product-images")
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const { data } = supabaseAdmin.storage
    .from("product-images")
    .getPublicUrl(fileName);

  return NextResponse.json({
    url: data.publicUrl,
  });
}
