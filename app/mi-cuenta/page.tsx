"use client";

import { useEffect, useState } from "react";
import { LogOut, PawPrint, ShoppingBag } from "lucide-react";
import { supabase } from "@/lib/supabase";

type UserData = {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
};

export default function MyAccountPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      setUser(null);
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
    window.location.href = "/";
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
              <p className="font-black uppercase text-green-700">
                Pedidos
              </p>
              <h2 className="text-3xl font-black">Mis pedidos</h2>
            </div>
          </div>

          <p className="mt-4 text-slate-600">
            Ya el login con Google está funcionando. El próximo paso será conectar
            tus pedidos a esta cuenta para que aparezcan aquí automáticamente.
          </p>

          <a
            href="/#consultar-pedido"
            className="mt-6 inline-block rounded-full bg-green-700 px-6 py-3 font-black text-white"
          >
            Consultar pedido por número
          </a>
        </div>

        <a
          href="/"
          className="mt-6 inline-block rounded-full bg-green-50 px-6 py-3 font-black text-green-800"
        >
          Volver a la tienda
        </a>
      </div>
    </main>
  );
}
