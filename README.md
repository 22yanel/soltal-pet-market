# Soltal Pet Market

Starter de tienda online hecha con código usando Next.js.

## Incluye

- Página principal
- Productos con imágenes reales
- Categorías y buscador
- Detalle de producto
- Carrito
- Checkout
- Factura descargable
- API inicial para pedidos
- Panel admin inicial
- SQL para Supabase

## Ejecutar

```bash
npm install
npm run dev
```

Página:

```txt
http://localhost:3000
```

Admin:

```txt
http://localhost:3000/admin
```

## WhatsApp Cloud API

Configura estas variables privadas en Vercel:

```txt
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_NOTIFY_NUMBERS=18095551234,18095555678
WHATSAPP_ADMIN_NUMBERS=18095551234
WHATSAPP_API_VERSION=v23.0
```

Webhook de Meta:

```txt
https://TU-DOMINIO.com/api/whatsapp
```

Los números deben incluir código de país y solo dígitos. `WHATSAPP_NOTIFY_NUMBERS`
acepta varios destinatarios separados por comas. Solo los números incluidos en
`WHATSAPP_ADMIN_NUMBERS` pueden cambiar estados escribiendo, por ejemplo,
`en camino 12` o `entregado 12`.
