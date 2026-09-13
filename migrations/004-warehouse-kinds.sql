-- Preserve historical destination semantics for unclassified records.
UPDATE entities SET payload=JSON_SET(payload,'$.kind','destino')
WHERE collection_name='warehouses' AND JSON_EXTRACT(payload,'$.kind') IS NULL;

-- Only classify the two explicitly confirmed origins when no route/box references exist.
UPDATE entities w
LEFT JOIN entities t ON t.collection_name='trucks'
  AND (JSON_SEARCH(t.payload,'one',CONVERT(w.entity_id USING utf8mb4),NULL,'$.stops[*].warehouseId') IS NOT NULL
       OR JSON_UNQUOTE(JSON_EXTRACT(t.payload,'$.originWarehouseId'))=CONVERT(w.entity_id USING utf8mb4) COLLATE utf8mb4_bin)
LEFT JOIN entities b ON b.collection_name='boxes'
  AND (JSON_UNQUOTE(JSON_EXTRACT(b.payload,'$.destinationWarehouseId'))=CONVERT(w.entity_id USING utf8mb4) COLLATE utf8mb4_bin
       OR JSON_UNQUOTE(JSON_EXTRACT(b.payload,'$.originWarehouseId'))=CONVERT(w.entity_id USING utf8mb4) COLLATE utf8mb4_bin)
SET w.payload=JSON_SET(w.payload,'$.kind','origen','$.country','Estados Unidos')
WHERE w.collection_name='warehouses' AND t.entity_id IS NULL AND b.entity_id IS NULL
AND JSON_UNQUOTE(JSON_EXTRACT(w.payload,'$.name')) IN ('Chicago · Arlington Heights','El Paso')
AND (JSON_UNQUOTE(JSON_EXTRACT(w.payload,'$.address')) LIKE '75 Algonquin Dr%'
     OR JSON_UNQUOTE(JSON_EXTRACT(w.payload,'$.address')) LIKE '1123 Desert Dr%');

UPDATE entities SET payload=JSON_SET(payload,'$.state','Illinois')
WHERE collection_name='warehouses' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.name'))='Chicago · Arlington Heights'
AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.address')) LIKE '75 Algonquin Dr%';
UPDATE entities SET payload=JSON_SET(payload,'$.state','Texas')
WHERE collection_name='warehouses' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.name'))='El Paso'
AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.address')) LIKE '1123 Desert Dr%';
UPDATE entities SET payload=JSON_SET(payload,'$.country','México','$.state','Jalisco')
WHERE collection_name='warehouses' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.name'))='México · Valle de Juárez'
AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.address')) LIKE 'Las Cuatro Esquinas%';

INSERT IGNORE INTO schema_migrations(version) VALUES (4);
