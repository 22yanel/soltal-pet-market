"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  useEffect(() => {
    const finishLogin = async () => {
      await supabase.auth.getSession();

      setTimeout(() => {
        window.location.href = "/mi-cuenta";
      }, 800);
    };

    finishLogin();
  }, []);

  return (
    <main className="min-h-screen bg-[#f7fbf5] p-6 text-slate-900">
      <div className="mx-auto max-w-md rounded-[2rem] bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-black">Iniciando sesión...</h1>
        <p className="mt-3 text-slate-600">
          Espera un momento, estamos conectando tu cuenta.
        </p>
      </div>
    </main>
  );
}
