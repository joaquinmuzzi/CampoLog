-- CampoLog — esquema inicial (plan.md, sección 2)

CREATE TABLE usuarios (
  id                SERIAL PRIMARY KEY,
  nombre            VARCHAR(60)  NOT NULL,
  apellido          VARCHAR(60)  NOT NULL,
  email             VARCHAR(254) NOT NULL UNIQUE,          -- RN2: email único (se guarda en minúsculas)
  password_hash     TEXT         NOT NULL,                 -- RN2: hash bcrypt
  rol               VARCHAR(10)  NOT NULL CHECK (rol IN ('ADMIN', 'DOCENTE', 'ESTUDIANTE')),
  comision_id       INT          NULL,                     -- RN3: el estudiante pertenece a una sola comisión
  intentos_fallidos INT          NOT NULL DEFAULT 0,       -- RN6
  bloqueado_hasta   TIMESTAMPTZ  NULL,                     -- RN6
  creado_en         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT estudiante_con_comision CHECK ((rol = 'ESTUDIANTE') = (comision_id IS NOT NULL))
);

CREATE TABLE comisiones (
  id                 SERIAL PRIMARY KEY,
  nombre             VARCHAR(80) NOT NULL,
  dias_semana        SMALLINT[]  NOT NULL,                  -- RN7: 1 = lunes ... 5 = viernes
  fecha_inicio       DATE        NOT NULL,
  fecha_fin          DATE        NOT NULL,
  horas_jornada      SMALLINT    NOT NULL CHECK (horas_jornada BETWEEN 1 AND 8),
  codigo_inscripcion CHAR(6)     NOT NULL UNIQUE,           -- RN7
  docente_id         INT         NOT NULL REFERENCES usuarios(id),
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fin_posterior_al_inicio CHECK (fecha_fin > fecha_inicio)
);

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_comision_fk FOREIGN KEY (comision_id) REFERENCES comisiones(id);

CREATE TABLE dias_no_laborables (
  id          SERIAL PRIMARY KEY,
  fecha       DATE        NOT NULL,
  motivo      VARCHAR(80) NOT NULL,
  tipo        VARCHAR(8)  NOT NULL CHECK (tipo IN ('FERIADO', 'RECESO')),   -- RN9
  comision_id INT         NULL REFERENCES comisiones(id) ON DELETE CASCADE,
  CONSTRAINT feriado_sin_comision CHECK ((tipo = 'FERIADO') = (comision_id IS NULL))
);
-- RN9: no puede haber dos días no laborables con la misma fecha y el mismo alcance.
CREATE UNIQUE INDEX dias_no_laborables_unico ON dias_no_laborables (fecha, COALESCE(comision_id, 0));

CREATE TABLE entradas (
  id             SERIAL PRIMARY KEY,
  estudiante_id  INT           NOT NULL REFERENCES usuarios(id),
  comision_id    INT           NOT NULL REFERENCES comisiones(id),
  fecha          DATE          NOT NULL,
  actividad      VARCHAR(120)  NOT NULL,
  descripcion    VARCHAR(2000) NOT NULL DEFAULT '',
  horas          NUMERIC(3,1)  NOT NULL CHECK (horas >= 0.5 AND horas <= 8),
  etiquetas      TEXT[]        NOT NULL DEFAULT '{}',
  estado         VARCHAR(10)   NOT NULL DEFAULT 'BORRADOR'
                 CHECK (estado IN ('BORRADOR', 'ENVIADA', 'OBSERVADA', 'VALIDADA')),   -- RN19
  version        INT           NOT NULL DEFAULT 1,      -- RN23
  enviada_en     TIMESTAMPTZ   NULL,
  observada_en   TIMESTAMPTZ   NULL,
  validada_en    TIMESTAMPTZ   NULL,
  creado_en      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT entradas_estudiante_fecha_unica UNIQUE (estudiante_id, fecha)   -- RN15
);
CREATE INDEX entradas_por_estudiante ON entradas (estudiante_id, fecha DESC);

CREATE TABLE evidencias (
  id         SERIAL PRIMARY KEY,
  entrada_id INT          NOT NULL REFERENCES entradas(id) ON DELETE CASCADE,
  tipo       VARCHAR(10)  NOT NULL CHECK (tipo IN ('COMMIT', 'DOCUMENTO', 'TAREA', 'IMAGEN', 'OTRO')),  -- RN18
  titulo     VARCHAR(80)  NOT NULL,
  url        VARCHAR(500) NOT NULL,
  orden      SMALLINT     NOT NULL
);

CREATE TABLE comentarios (
  id         SERIAL PRIMARY KEY,
  entrada_id INT          NOT NULL REFERENCES entradas(id) ON DELETE CASCADE,
  autor_id   INT          NOT NULL REFERENCES usuarios(id),
  tipo       VARCHAR(12)  NOT NULL CHECK (tipo IN ('OBSERVACION', 'VALIDACION')),   -- RN22
  texto      VARCHAR(500) NOT NULL,
  creado_en  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
