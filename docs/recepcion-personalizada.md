# Recepción personalizada sin alterar tarifas históricas

## Ejemplo: 13 piezas, 726 lb, USD 3.50/lb

1. En Recepción, selecciona cliente, destinatario y origen.
2. Método de cobro: **Carga especial · tarifa por libra**. Ingresa **3.50**. Esto no cambia la tarifa general de configuración.
3. Cantidad: **13**. Cómo se pesaron: **Peso total del grupo · pesados juntos**. Ingresa **726** una sola vez.
4. Total antes de guardar: **USD 2,541.00**. Se conserva el redondeo hacia arriba a la libra completa, aplicado una vez al peso del grupo, no trece veces.
5. Forma de pago: **Combinar pagos**. Efectivo: **1000**; Zelle: **1541**. La referencia de Zelle es opcional. «Completar restante» rellena el saldo del renglón, sin confirmar ningún cobro.
6. Confirma la ubicación y guarda. Se crean 13 códigos/etiquetas y se conserva un solo número de recepción.

## Pesos y documentos

Las piezas no pesadas individualmente reciben una asignación proporcional uniforme a 0.001 lb, con ajuste del residuo para preservar el total exacto. Se identifica explícitamente como peso **prorrateado**, nunca como un pesaje individual. Los cargos se distribuyen en centavos conservando el total. El camión suma las asignaciones de las piezas efectivamente cargadas; un grupo completo suma 726 lb, mientras una carga parcial usa una estimación.

Las etiquetas, detalle administrativo, detalle del cliente, recibo térmico y manifiesto identifican el prorrateo. No se puede editar aisladamente el peso de una pieza de grupo y romper el total; las reglas existentes de documentos facturados se mantienen.

El peso individual continúa siendo el modo predeterminado. El peso conjunto se ofrece para peso y carga especial, no para volumen: el cobro por medidas conserva su funcionamiento anterior. En carga especial con precio manual y peso conjunto, el importe indicado es **por todo el grupo**, no por pieza.

## Pagos combinados

Se admiten 2–5 renglones de efectivo, Zelle, transferencia, depósito o tarjeta externa. Son registros de dinero ya recibido, no transferencias ni cargos automáticos. Clover continúa usando su formulario y confirmación segura; no se incluye dentro de los pagos externos combinados.

La suma debe cubrir exactamente el total. Se rechazan faltantes y excesos antes de confirmar; la transacción revierte paquetes, facturas y registros si hay un error. Cada aplicación a factura conserva folio, método, monto, referencia, fecha, ubicación y operador. Un pago puede distribuirse entre varias facturas, sin duplicar su monto. El recibo térmico resume los pagos por método. Reintentar una recepción con su identificador no crea piezas ni cobros duplicados.

No modifica datos o importes de recepciones anteriores y no requiere una migración SQL nueva. Para revisar un caso ya guardado hacen falta su guía/número de recepción y el cliente; no debe corregirse por aproximación.
