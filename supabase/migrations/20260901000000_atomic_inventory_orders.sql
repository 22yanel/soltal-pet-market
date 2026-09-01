-- Mantiene pedidos e inventario consistentes bajo compras simultáneas.
-- Las funciones usan los permisos del llamador y solo service_role puede ejecutarlas.

create or replace function public.create_order_with_stock(
  p_customer jsonb,
  p_items jsonb,
  p_user_id uuid default null,
  p_user_email text default null
)
returns public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders;
  v_items jsonb;
  v_total numeric;
  v_requested_count integer;
  v_product_count integer;
  v_unavailable_product text;
begin
  if p_customer is null or jsonb_typeof(p_customer) <> 'object' then
    raise exception 'Los datos del cliente no son válidos.' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as item
    where jsonb_typeof(item->'id') <> 'number'
       or jsonb_typeof(item->'quantity') <> 'number'
       or (item->>'id')::numeric <= 0
       or mod((item->>'id')::numeric, 1) <> 0
       or (item->>'quantity')::numeric <= 0
       or mod((item->>'quantity')::numeric, 1) <> 0
  ) then
    raise exception 'El carrito contiene cantidades o productos no válidos.' using errcode = '22023';
  end if;

  select count(*), count(distinct (item->>'id')::bigint)
  into v_requested_count, v_product_count
  from jsonb_array_elements(p_items) as item;

  if v_requested_count <> v_product_count then
    raise exception 'El carrito contiene productos repetidos.' using errcode = '22023';
  end if;

  -- Orden estable para evitar interbloqueos cuando dos carritos comparten productos.
  perform product.id
  from public.products as product
  join jsonb_array_elements(p_items) as item
    on product.id = (item->>'id')::bigint
  order by product.id
  for update of product;

  select count(*)
  into v_product_count
  from public.products as product
  join jsonb_array_elements(p_items) as item
    on product.id = (item->>'id')::bigint;

  if v_product_count <> v_requested_count then
    raise exception 'Uno de los productos ya no existe.' using errcode = 'P0002';
  end if;

  select product.name
  into v_unavailable_product
  from public.products as product
  join jsonb_array_elements(p_items) as item
    on product.id = (item->>'id')::bigint
  where coalesce(product.stock, 0) < (item->>'quantity')::integer
  order by product.id
  limit 1;

  if v_unavailable_product is not null then
    raise exception 'No hay stock suficiente para %.', v_unavailable_product using errcode = 'P0001';
  end if;

  select
    jsonb_agg(
      jsonb_build_object(
        'id', product.id,
        'name', product.name,
        'price', product.price,
        'quantity', (item->>'quantity')::integer
      )
      order by product.id
    ),
    sum(product.price * (item->>'quantity')::integer)
  into v_items, v_total
  from public.products as product
  join jsonb_array_elements(p_items) as item
    on product.id = (item->>'id')::bigint;

  update public.products as product
  set stock = coalesce(product.stock, 0) - requested.quantity
  from (
    select
      (item->>'id')::bigint as product_id,
      (item->>'quantity')::integer as quantity
    from jsonb_array_elements(p_items) as item
  ) as requested
  where product.id = requested.product_id;

  insert into public.orders (customer, items, total, status, user_id, user_email)
  values (p_customer, v_items, v_total, 'received', p_user_id, p_user_email)
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.update_order_status_with_stock(
  p_order_id bigint,
  p_new_status text
)
returns public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders;
  v_product_count integer;
  v_item_count integer;
  v_unavailable_product text;
begin
  if p_new_status not in ('received', 'preparing', 'on_the_way', 'delivered', 'cancelled') then
    raise exception 'Estado no permitido.' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'No se encontró el pedido.' using errcode = 'P0002';
  end if;

  if v_order.status = p_new_status then
    return v_order;
  end if;

  if v_order.status <> 'cancelled' and p_new_status = 'cancelled' then
    perform product.id
    from public.products as product
    join jsonb_array_elements(v_order.items) as item
      on product.id = (item->>'id')::bigint
    order by product.id
    for update of product;

    update public.products as product
    set stock = coalesce(product.stock, 0) + returned.quantity
    from (
      select
        (item->>'id')::bigint as product_id,
        (item->>'quantity')::integer as quantity
      from jsonb_array_elements(v_order.items) as item
    ) as returned
    where product.id = returned.product_id;
  elsif v_order.status = 'cancelled' and p_new_status <> 'cancelled' then
    perform product.id
    from public.products as product
    join jsonb_array_elements(v_order.items) as item
      on product.id = (item->>'id')::bigint
    order by product.id
    for update of product;

    select count(*), jsonb_array_length(v_order.items)
    into v_product_count, v_item_count
    from public.products as product
    join jsonb_array_elements(v_order.items) as item
      on product.id = (item->>'id')::bigint;

    if v_product_count <> v_item_count then
      raise exception 'No se puede reactivar: uno de los productos ya no existe.' using errcode = 'P0002';
    end if;

    select product.name
    into v_unavailable_product
    from public.products as product
    join jsonb_array_elements(v_order.items) as item
      on product.id = (item->>'id')::bigint
    where coalesce(product.stock, 0) < (item->>'quantity')::integer
    order by product.id
    limit 1;

    if v_unavailable_product is not null then
      raise exception 'No se puede reactivar: stock insuficiente para %.', v_unavailable_product using errcode = 'P0001';
    end if;

    update public.products as product
    set stock = coalesce(product.stock, 0) - reserved.quantity
    from (
      select
        (item->>'id')::bigint as product_id,
        (item->>'quantity')::integer as quantity
      from jsonb_array_elements(v_order.items) as item
    ) as reserved
    where product.id = reserved.product_id;
  end if;

  update public.orders
  set status = p_new_status
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.cancel_customer_order_with_stock(
  p_order_id bigint,
  p_phone text
)
returns public.orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'No encontramos ese pedido.' using errcode = 'P0002';
  end if;

  if regexp_replace(coalesce(v_order.customer->>'phone', ''), '\D', '', 'g') = ''
     or regexp_replace(coalesce(v_order.customer->>'phone', ''), '\D', '', 'g')
        <> regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') then
    raise exception 'El teléfono no coincide con el pedido.' using errcode = '42501';
  end if;

  if v_order.status not in ('received', 'preparing') then
    raise exception 'Este pedido ya no puede cancelarse.' using errcode = '22023';
  end if;

  return public.update_order_status_with_stock(p_order_id, 'cancelled');
end;
$$;

revoke all on function public.create_order_with_stock(jsonb, jsonb, uuid, text) from public, anon, authenticated;
revoke all on function public.update_order_status_with_stock(bigint, text) from public, anon, authenticated;
revoke all on function public.cancel_customer_order_with_stock(bigint, text) from public, anon, authenticated;

grant execute on function public.create_order_with_stock(jsonb, jsonb, uuid, text) to service_role;
grant execute on function public.update_order_status_with_stock(bigint, text) to service_role;
grant execute on function public.cancel_customer_order_with_stock(bigint, text) to service_role;

