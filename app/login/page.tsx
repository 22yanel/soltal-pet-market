"use client";

import { useState } from "react";
import { PawPrint } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loginWithGoogle = async () => {
    setLoading(true);
    setMessage("Redirigiendo a Google...");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
     redirectTo: "https://soltal-pet-market-wwtr-la03wq9bg.vercel.app/auth/callback",
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7fbf5] px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-md rounded-[2rem] bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-700 text-white">
            <PawPrint />
          </div>

          <div>
            <p className="text-xl font-black text-green-800">SOLTAL PET</p>
            <p className="font-black text-lime-600">MARKET</p>
          </div>
        </div>

        <h1 className="mt-8 text-4xl font-black">Iniciar sesión</h1>

        <p className="mt-3 text-slate-600">
          Entra con tu cuenta de Google para ver tus pedidos y comprar más rápido.
        </p>

        <button
          onClick={loginWithGoogle}
          disabled={loading}
          className="mt-8 w-full rounded-2xl bg-green-700 px-6 py-4 font-black text-white hover:bg-green-800 disabled:bg-slate-300"
        >
          {loading ? "Abriendo Google..." : "Continuar con Google"}
        </button>

        {message && (
          <p className="mt-4 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-800">
            {message}
          </p>
        )}

        <a
          href="/"
          className="mt-6 block text-center font-black text-green-700"
        >
          Volver a la tienda
        </a>
      </div>
    </main>
  );
}
