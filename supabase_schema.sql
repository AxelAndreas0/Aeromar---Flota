-- ================================================================
-- AEROMAR FLEET MANAGER — SCHEMA COMPLETO
-- Ejecutar en Supabase → SQL Editor
-- ================================================================

-- Limpiar tablas anteriores
DROP TABLE IF EXISTS mantenimientos CASCADE;
DROP TABLE IF EXISTS habilitaciones CASCADE;
DROP TABLE IF EXISTS gastos_taller CASCADE;
DROP TABLE IF EXISTS combustible CASCADE;
DROP TABLE IF EXISTS viajes CASCADE;
DROP TABLE IF EXISTS choferes CASCADE;
DROP TABLE IF EXISTS vehiculos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS config_alertas CASCADE;
DROP TABLE IF EXISTS tipo_cambio CASCADE;

-- ── Usuarios ────────────────────────────────────────────────────
CREATE TABLE usuarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  rol         TEXT NOT NULL CHECK (rol IN ('admin','operador','visualizador')),
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Vehículos ───────────────────────────────────────────────────
CREATE TABLE vehiculos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              TEXT NOT NULL,
  marca               TEXT NOT NULL,
  modelo              TEXT NOT NULL,
  chapa               TEXT UNIQUE NOT NULL,
  tipo                TEXT NOT NULL CHECK (tipo IN ('camion','fiorino','auto','moto','otro')),
  anio                INTEGER,
  color               TEXT DEFAULT '',
  estado              TEXT DEFAULT 'Libre' CHECK (estado IN ('Libre','En ruta','En taller','Reservado','Fuera de servicio')),
  chofer_asignado     TEXT DEFAULT '',
  odometro_actual     INTEGER DEFAULT 0,
  limite_combustible  BIGINT DEFAULT 0,
  credito_utilizado   BIGINT DEFAULT 0,
  notas               TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Choferes ────────────────────────────────────────────────────
CREATE TABLE choferes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  ci          TEXT DEFAULT '',
  telefono    TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  vehiculo_id UUID REFERENCES vehiculos(id),
  activo      BOOLEAN DEFAULT TRUE,
  notas       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Viajes ──────────────────────────────────────────────────────
CREATE TABLE viajes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha           DATE NOT NULL,
  vehiculo_id     UUID REFERENCES vehiculos(id),
  vehiculo_nombre TEXT NOT NULL,
  chofer          TEXT NOT NULL,
  cliente         TEXT NOT NULL DEFAULT 'Aeromar Internacional SRL',
  origen          TEXT NOT NULL,
  destino         TEXT NOT NULL,
  tipo_carga      TEXT DEFAULT 'Seca' CHECK (tipo_carga IN ('Seca','2-8°C','15-25°C','INTERNO','TALLER','Otro')),
  km_recorridos   INTEGER DEFAULT 0,
  precio_gs       BIGINT DEFAULT 0,
  precio_usd      NUMERIC(10,2) DEFAULT 0,
  nro_viaje       INTEGER DEFAULT 1,
  factura         TEXT DEFAULT '',
  nro_evento      TEXT DEFAULT '',
  estado          TEXT DEFAULT 'Confirmado' CHECK (estado IN ('Confirmado','A confirmar','Completado','Cancelado')),
  es_interno      BOOLEAN DEFAULT FALSE,
  observaciones   TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Combustible ─────────────────────────────────────────────────
CREATE TABLE combustible (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha           DATE NOT NULL,
  vehiculo_id     UUID REFERENCES vehiculos(id),
  vehiculo_nombre TEXT NOT NULL,
  litros          NUMERIC(8,2) DEFAULT 0,
  precio_gs       BIGINT DEFAULT 0,
  precio_usd      NUMERIC(10,2) DEFAULT 0,
  tipo_carga      TEXT DEFAULT 'Manual' CHECK (tipo_carga IN ('Manual','Línea de crédito')),
  proveedor       TEXT DEFAULT '',
  observaciones   TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Taller ──────────────────────────────────────────────────────
CREATE TABLE gastos_taller (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_ingreso   DATE NOT NULL,
  fecha_salida    DATE,
  vehiculo_id     UUID REFERENCES vehiculos(id),
  vehiculo_nombre TEXT NOT NULL,
  motivo          TEXT NOT NULL,
  descripcion     TEXT DEFAULT '',
  monto_gs        BIGINT DEFAULT 0,
  monto_usd       NUMERIC(10,2) DEFAULT 0,
  foto_factura    TEXT DEFAULT '',
  estado          TEXT DEFAULT 'En taller' CHECK (estado IN ('En taller','Listo','Entregado')),
  observaciones   TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Habilitaciones y documentos ─────────────────────────────────
CREATE TABLE habilitaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id     UUID REFERENCES vehiculos(id),
  vehiculo_nombre TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('Habilitación','DINATRAN','Seguro','Revisión técnica','Otro')),
  fecha_vencimiento DATE NOT NULL,
  dias_alerta     INTEGER DEFAULT 30,
  observaciones   TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Mantenimientos ──────────────────────────────────────────────
CREATE TABLE mantenimientos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id         UUID REFERENCES vehiculos(id),
  vehiculo_nombre     TEXT NOT NULL,
  tipo                TEXT NOT NULL,
  fecha_ultimo        DATE,
  km_ultimo           INTEGER DEFAULT 0,
  fecha_proximo       DATE NOT NULL,
  km_proximo          INTEGER DEFAULT 0,
  dias_alerta         INTEGER DEFAULT 15,
  monto_gs            BIGINT DEFAULT 0,
  monto_usd           NUMERIC(10,2) DEFAULT 0,
  estado              TEXT DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente','Completado','Vencido')),
  observaciones       TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tipo de cambio ──────────────────────────────────────────────
CREATE TABLE tipo_cambio (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       DATE NOT NULL UNIQUE,
  usd_gs      NUMERIC(10,2) NOT NULL,
  fuente      TEXT DEFAULT 'BCP',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Configuración de alertas ─────────────────────────────────────
CREATE TABLE config_alertas (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combustible_amarillo    INTEGER DEFAULT 70,
  combustible_naranja     INTEGER DEFAULT 85,
  combustible_rojo        INTEGER DEFAULT 95,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── Datos iniciales: usuarios ────────────────────────────────────
INSERT INTO usuarios (email, nombre, rol) VALUES
  ('agaier@aeromar.com.py',      'Axel Gaier',      'admin'),
  ('logistica3@aeromar.com.py',  'Andrea Amarilla',  'operador'),
  ('egarcete@aeromar.com.py',    'Ernesto Garcete',  'visualizador');

-- ── Datos iniciales: vehículos ───────────────────────────────────
INSERT INTO vehiculos (nombre, marca, modelo, chapa, tipo, chofer_asignado, limite_combustible) VALUES
  ('Aero 001',   'Scania',      'P400',        'AERO001',  'camion',  'Silvio Parris',    8000000),
  ('Aero 002',   'Mercedes',    'Atego 1320',  'AERO002',  'camion',  'Cristiam Benítez', 6000001),
  ('Aero 003',   'Scania',      'P250',        'AERO003',  'camion',  '',                 0),
  ('Aero 004',   'Scania',      'P250',        'AERO004',  'camion',  'Jesús Fleitas',    0),
  ('711 OBL344', 'Mercedes',    '711',         'OBL344',   'camion',  'Eliseo Escobar',   5000000),
  ('708 ABN700', 'Mercedes',    '708',         'ABN700',   'camion',  '',                 1000000),
  ('JAC BYR033', 'JAC',         'HFC1040',     'BYR033',   'camion',  '',                 1000000),
  ('Fiorino HEL642',  'Fiat',   'Fiorino',     'HEL642',   'fiorino', '',                 2500000),
  ('Fiorino AABG508', 'Fiat',   'Fiorino',     'AABG508',  'fiorino', '',                 2500000),
  ('Fiat Mobi HFG381','Fiat',   'Mobi',        'HFG381',   'auto',    '',                 1200000),
  ('VW Saveiro BOV216','VW',    'Saveiro',     'BOV216',   'auto',    '',                 1200000),
  ('Moto AAME125',    'Kenton', 'GTR',         'AAME125',  'moto',    '',                 500000),
  ('Moto AAME126',    'Kenton', 'GTR',         'AAME126',  'moto',    '',                 500000);

-- ── Datos iniciales: choferes ────────────────────────────────────
INSERT INTO choferes (nombre, ci) VALUES
  ('Silvio Parris',    '3.615.171'),
  ('Cristiam Benítez', '1.867.889'),
  ('Jesús Fleitas',    '5.026.652'),
  ('Eliseo Escobar',   '759.059'),
  ('Gabriel Ávalos',   '5.644.731');

-- ── Config alertas por defecto ───────────────────────────────────
INSERT INTO config_alertas (combustible_amarillo, combustible_naranja, combustible_rojo)
VALUES (70, 85, 95);

-- ── RLS ─────────────────────────────────────────────────────────
ALTER TABLE usuarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE choferes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE viajes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustible     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_taller   ENABLE ROW LEVEL SECURITY;
ALTER TABLE habilitaciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mantenimientos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_cambio     ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_alertas  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON usuarios        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON vehiculos       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON choferes        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON viajes          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON combustible     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON gastos_taller   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON habilitaciones  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON mantenimientos  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON tipo_cambio     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON config_alertas  FOR ALL USING (true) WITH CHECK (true);

-- ── Realtime ─────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE vehiculos;
ALTER PUBLICATION supabase_realtime ADD TABLE viajes;
ALTER PUBLICATION supabase_realtime ADD TABLE combustible;
ALTER PUBLICATION supabase_realtime ADD TABLE gastos_taller;
ALTER PUBLICATION supabase_realtime ADD TABLE habilitaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE mantenimientos;
