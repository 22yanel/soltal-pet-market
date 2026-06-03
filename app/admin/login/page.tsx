"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const login = async () => {
    setStatus("Verificando...");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus(result.error || "Contraseña incorrecta.");
      return;
    }

    window.location.href = "/admin";
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fbf5] p-6">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-green-700 text-white">
          <Lock size={28} />
        </div>

        <h1 className="mt-6 text-center text-3xl font-black text-slate-950">
          Acceso administrador
        </h1>

        <p className="mt-2 text-center text-slate-600">
          Ingresa la contraseña para administrar Soltal Pet Market.
        </p>

        <div className="mt-8">
          <label className="mb-2 block text-sm font-black">Contraseña</label>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") login();
            }}
            placeholder="Escribe la contraseña"
            className="w-full rounded-2xl border border-green-100 bg-[#f7fbf5] px-4 py-3 outline-none"
          />
        </div>

        <button
          onClick={login}
          className="mt-5 w-full rounded-2xl bg-green-700 px-6 py-4 font-black text-white hover:bg-green-800"
        >
          Entrar al panel
        </button>

        {status && (
          <p className="mt-4 text-center text-sm font-bold text-slate-600">
            {status}
          </p>
        )}
      </div>
    </main>
  );
}
