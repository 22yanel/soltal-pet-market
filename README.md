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

## WhatsApp mediante OpenWA

OpenWA funciona como un puente separado que mantiene activa la sesión de
WhatsApp Web. Configura estas variables privadas en Vercel:

```txt
OPENWA_GATEWAY_URL=https://URL-PUBLICA-DEL-PUENTE
OPENWA_API_KEY=CLAVE-LARGA-Y-ALEATORIA
OPENWA_WEBHOOK_SECRET=OTRA-CLAVE-LARGA-Y-ALEATORIA
WHATSAPP_NOTIFY_NUMBERS=18299632299,18094447292
WHATSAPP_ADMIN_NUMBERS=18299632299,18094447292
```

En `openwa-gateway/.env`, configura la misma clave y secreto, además del
webhook del sitio:

```txt
PORT=8080
OPENWA_SESSION_ID=soltal-pet-market
OPENWA_HEADLESS=false
OPENWA_API_KEY=CLAVE-LARGA-Y-ALEATORIA
OPENWA_WEBHOOK_URL=https://TU-DOMINIO.com/api/whatsapp
OPENWA_WEBHOOK_SECRET=OTRA-CLAVE-LARGA-Y-ALEATORIA
```

Instala e inicia el puente desde `openwa-gateway`:

```bash
npm install
npm start
```

En el primer inicio aparecerá un código QR. Escanéalo desde WhatsApp en
**Dispositivos vinculados**. El puente debe permanecer encendido y estar
expuesto únicamente mediante HTTPS; nunca publiques el puerto sin la clave.
Después del primer enlace puedes establecer `OPENWA_HEADLESS=true` para que
WhatsApp se ejecute en segundo plano.

Los números deben incluir código de país y solo dígitos. `WHATSAPP_NOTIFY_NUMBERS`
acepta varios destinatarios separados por comas. Solo los números incluidos en
`WHATSAPP_ADMIN_NUMBERS` pueden cambiar estados escribiendo, por ejemplo,
`en camino 12` o `entregado 12`.

OpenWA no es una integración oficial de Meta. Usa un número dedicado, evita
mensajes masivos y conserva Telegram como canal de respaldo.
