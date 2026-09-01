-- Los pedidos se crean únicamente desde las rutas seguras del servidor.
-- Esto reduce la superficie de ataque y elimina políticas INSERT innecesarias.

drop policy if exists "Clientes crean sus propios pedidos" on public.orders;
drop policy if exists "Invitados crean pedidos validos" on public.orders;

revoke insert on table public.orders from anon, authenticated;

drop policy if exists "Productos visibles para todos" on public.products;

create policy "Productos visibles para clientes"
on public.products
for select
to anon, authenticated
using (true);

