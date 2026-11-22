import { receptionUtilMessages } from "../catalogs/reception-utils";

/**
 * Mensajes de las Server Actions: Recepción y almacén — warehouse-actions.ts, file-actions.ts, cargo-weight-actions.ts, utils/reception-concepts.ts, utils/group-weight.ts y utils/reception-pieces.ts.
 * Los traduce `runMutation` al devolver el resultado (campos `error`, `message`…), según el idioma de la petición.
 * Clave: el texto en español tal como lo devuelve el código; los valores variables van como `{nombre}`
 * («La caja {code} ya está cargada.» cubre cualquier código). Clave: español; valor: inglés.
 */
export const receptionMessages = {
  // Errores de los cálculos de recepción que devuelve receivePackageGroup (catalogs/reception-utils.ts)
  ...receptionUtilMessages,
  // warehouse-actions.ts · saveAdminPrealert y selectPrealertAtWarehouse
  "Revisa la prealerta.": "Check the pre-alert.",
  "Selecciona cliente activo y categoría vigente.": "Select an active customer and a current category.",
  "Solo puedes editar o reasignar prealertas no recibidas.": "You can only edit or reassign pre-alerts that haven't been received.",
  "Ese tracking ya existe.": "That tracking number already exists.",
  "La prealerta ya no está disponible para este cliente.": "The pre-alert is no longer available for this customer.",
  // warehouse-actions.ts · saveWarehouse
  "Revisa el nombre, ciudad y mensaje de llegada.": "Check the name, city and arrival message.",
  "El almacén no existe.": "The warehouse doesn't exist.",
  "El tipo de un almacén con movimientos debe conservarse. Crea otra ubicación o revisa sus vínculos antes de cambiarlo.": "A warehouse with activity must keep its type. Create another location or review its links before changing it.",
  "Un almacén con viajes asociados debe conservar su ciudad.": "A warehouse with linked trips must keep its city.",
  "Hay viajes abiertos para este almacén. Finalízalos antes de desactivarlo.": "There are open trips for this warehouse. Finish them before deactivating it.",
  // warehouse-actions.ts · saveWarehouseOperator
  "Revisa el operador.": "Check the operator.",
  "Revisa los almacenes asignados.": "Check the assigned warehouses.",
  "El operador no existe.": "The operator doesn't exist.",
  "El correo de acceso se conserva; crea una nueva cuenta para otro operador.": "The sign-in email can't be changed; create a new account for a different operator.",
  "Ya existe una cuenta con ese correo.": "An account with that email already exists.",
  // warehouse-actions.ts · scanLoad y loadSelectedPackages
  "Configura las paradas y fechas del viaje antes de cargar.": "Set up the trip's stops and dates before loading.",
  "Código de paquete no encontrado.": "Package code not found.",
  "Selecciona entre 1 y 500 paquetes disponibles.": "Select between 1 and 500 available packages.",
  "Selecciona un camión disponible, sin despachar.": "Select an available truck that hasn't been dispatched.",
  "Selecciona un destino guardado en la ruta del camión.": "Select a destination saved in the truck's route.",
  "Un paquete seleccionado ya no existe. Actualiza Bodega.": "A selected package no longer exists. Refresh the warehouse page.",
  "{code}: {error} No se cargó ninguna caja de la selección.": "{code}: {error} None of the selected boxes were loaded.",
  // warehouse-actions.ts · scanUnload
  "No tienes permiso de recepción en este almacén.": "You don't have receiving permission at this warehouse.",
  "Selecciona un camión despachado que visite este almacén.": "Select a dispatched truck that stops at this warehouse.",
  "El paquete no corresponde a este camión y almacén.": "The package doesn't belong to this truck and warehouse.",
  "Este paquete ya fue descargado; no se duplicó el evento.": "This package was already unloaded; the event wasn't duplicated.",
  "El paquete no está en tránsito.": "The package isn't in transit.",
  // warehouse-actions.ts · saveTruckStops
  "Solo puedes cambiar paradas antes del despacho.": "You can only change stops before dispatch.",
  "Selecciona un almacén de origen activo.": "Select an active origin warehouse.",
  "El almacén de salida no está habilitado como origen.": "The departure warehouse isn't enabled as an origin.",
  "Retira la carga antes de cambiar el origen del viaje.": "Remove the load before changing the trip's origin.",
  "Agrega al menos un almacén con una fecha válida.": "Add at least one warehouse with a valid date.",
  "No repitas un almacén en la misma ruta.": "Don't repeat a warehouse in the same route.",
  "Selecciona almacenes de destino activos, diferentes del origen, y fechas ordenadas posteriores a la salida.": "Select active destination warehouses other than the origin, with dates in order and after departure.",
  "Retira primero los paquetes asignados a paradas que deseas quitar.": "First remove the packages assigned to the stops you want to remove.",
  // cargo-weight-actions.ts
  "Escribe un peso real válido (hasta tres decimales).": "Enter a valid actual weight (up to three decimals).",
  "Solo se completa un peso pendiente de carga cotizada antes de salir de origen. Actualiza el detalle.": "A pending weight can only be completed for quoted cargo before it leaves the origin. Refresh the details.",
  "El camión ya salió; no se modifica su peso histórico.": "The truck has already left; its recorded weight isn't changed.",
  "El peso registrado superaría la capacidad del camión.": "The recorded weight would exceed the truck's capacity.",
  // file-actions.ts · receivePackageGroup
  "Revisa el peso conjunto (máximo tres decimales).": "Check the combined weight (up to three decimals).",
  "Una recepción mixta requiere un cliente y conceptos válidos, sin rechazo parcial.": "A mixed receipt requires one customer and valid line items, with no partial rejection.",
  "Revisa las piezas del grupo.": "Check the group's pieces.",
  "Revisa los paquetes (máximo 50).": "Check the packages (up to 50).",
  "Identificador de recepción inválido.": "Invalid receipt identifier.",
  "Esta recepción ya se guardó con otros datos. Revisa la bodega antes de continuar.": "This receipt was already saved with different data. Check the warehouse before continuing.",
  "Un grupo debe tener el mismo cliente, origen y destinatario.": "A group must have the same customer, origin and recipient.",
  "El peso conjunto requiere un mismo tipo de cobro y tarifa, sin rechazos parciales.": "Combined weight requires the same pricing method and rate, with no partial rejections.",
  "Una prealerta solo puede vincularse a una pieza.": "A pre-alert can only be linked to one piece.",
  "Revisa el método y el monto del pago.": "Check the payment method and amount.",
  "No se puede cobrar un grupo con piezas rechazadas.": "A group with rejected pieces can't be charged.",
  "El monto debe cubrir el total del grupo: USD {total}.": "The amount must cover the group total: USD {total}.",
  // file-actions.ts · completeReceptionPayment
  "No encontramos esta recepción. Revisa las facturas.": "We couldn't find this receipt. Check the invoices.",
  "Revisa el método, monto y ubicación.": "Check the method, amount and location.",
  "La recepción no admite cobros.": "This receipt doesn't accept charges.",
  "El monto debe cubrir el total exacto de la recepción.": "The amount must cover the receipt's exact total.",
  "Clover tiene un cargo en curso o confirmado. Verifica su estado antes de usar otro método.": "Clover has a charge in progress or already confirmed. Check its status before using another method.",
  // file-actions.ts · receiveBoxWithPhoto, pagos de recepción y collectDestinationPayment
  "Revisa el pago.": "Check the payment.",
  "Selecciona la ubicación donde registras el pago.": "Select the location where you're recording the payment.",
  "No se puede registrar un pago para una caja rechazada.": "A payment can't be recorded for a rejected box.",
  "Indica los pagos y una ubicación activa.": "Enter the payments and an active location.",
  "Los pagos combinados deben sumar exactamente USD {total}.": "The combined payments must add up to exactly USD {total}.",
  "Las facturas ya tienen un pago o un cargo en revisión. Actualiza antes de continuar.": "The invoices already have a payment or a charge under review. Refresh before continuing.",
  "La factura ya cambió. Actualiza antes de registrar el cobro.": "The invoice has changed. Refresh before recording the charge.",
  "El monto recibido debe coincidir con el total exacto de la factura.": "The amount received must match the invoice's exact total.",
  "Selecciona una ubicación activa para el cobro.": "Select an active location for the charge.",
  "La factura no tiene un cobro pendiente. Actualiza antes de continuar.": "The invoice has no pending charge. Refresh before continuing.",
  "Selecciona el método con el que se recibió el pago.": "Select the method the payment was received with.",
  "Selecciona la ubicación del cobro.": "Select the payment location.",
  // files/repository.ts · validateUpload (lo devuelven las acciones de file-actions.ts)
  "El archivo debe contener datos y pesar como máximo 2 MB.": "The file must contain data and be 2 MB at most.",
  "La foto debe ser un JPG o PNG válido.": "The photo must be a valid JPG or PNG.",
  "El comprobante debe ser JPG, PNG o PDF válido.": "The proof of payment must be a valid JPG, PNG or PDF.",
  "La foto comprimida supera 2 MB. Elige una foto más pequeña.": "The compressed photo is over 2 MB. Choose a smaller photo.",
  "La fotografía no se puede decodificar. Usa una imagen JPG o PNG válida.": "The photo can't be decoded. Use a valid JPG or PNG image.",
} as const;
