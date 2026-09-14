# Capacidad y resumen físico del camión

Los cupos por cantidad/categoría dejan de limitar la carga, incluso en viajes existentes. Los valores históricos `capacity` se conservan por compatibilidad, pero ya no se usan para autorizar el ingreso.

Al crear o editar un viaje planificado se puede configurar `maxWeightLb`, un límite opcional de peso real. Vacío significa sin límite configurado, no capacidad física ilimitada. No se inventa una capacidad ni se utiliza el peso dimensional de facturación. El servidor bloquea una carga que supere el límite y lo vuelve a comprobar al despachar. No permite reducirlo por debajo del peso de los paquetes ya vinculados.

Junto al escáner y en el detalle se muestran cantidad de piezas, suma del peso real en libras y suma del volumen exterior en ft³ y m³. Las medidas originales se muestran por pieza. El volumen sumado no representa las dimensiones del camión ni incluye huecos de estiba. Los contadores se recalculan al agregar o retirar carga y se conserva la comprobación de códigos duplicados, origen, destino y estado del viaje.

No requiere migración SQL: el límite se guarda en el JSON del viaje. La aplicación de límites físicos reales sigue requiriendo que operaciones capture la capacidad correcta del vehículo.
