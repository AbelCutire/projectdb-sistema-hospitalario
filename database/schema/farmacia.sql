-- INDEPENDIENTES

CREATE TABLE PRESENTACION (
    codigo SERIAL PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL,
    unidad VARCHAR(50) NOT NULL
);

CREATE TABLE ACCION_TERAPEUTICA (
    id_accion_terapeutica SERIAL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL
);

CREATE TABLE MONODROGA (
    id_monodroga SERIAL PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL
);

CREATE TABLE LABORATORIO_PRODUCCION (
    codigo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255)
);

CREATE TABLE FARMACIA (
    id_farmacia SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    stock INT NOT NULL,
    precio DECIMAL(10,2) NOT NULL
);

-- DEPENDIENTES
-- Laboratorio, Monodroga y Acción Terapéutica
CREATE TABLE MEDICAMENTO (
    codigo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    id_accion_terapeutica INT NOT NULL,
    id_monodroga INT NOT NULL,
    codigo_laboratorio INT NOT NULL,
    CONSTRAINT fk_med_accion FOREIGN KEY (id_accion_terapeutica) REFERENCES ACCION_TERAPEUTICA(id_accion_terapeutica),
    CONSTRAINT fk_med_monodroga FOREIGN KEY (id_monodroga) REFERENCES MONODROGA(id_monodroga),
    CONSTRAINT fk_med_lab FOREIGN KEY (codigo_laboratorio) REFERENCES LABORATORIO_PRODUCCION(codigo)
);

-- Farmacia, Presentación y Medicamento
CREATE TABLE STOCK (
    item SERIAL PRIMARY KEY,
    cantidad INT NOT NULL,
    id_farmacia INT NOT NULL,
    codigo_medicamento INT NOT NULL,
    codigo_presentacion INT NOT NULL,
    CONSTRAINT fk_stock_farmacia FOREIGN KEY (id_farmacia) REFERENCES FARMACIA(id_farmacia),
    CONSTRAINT fk_stock_medicamento FOREIGN KEY (codigo_medicamento) REFERENCES MEDICAMENTO(codigo),
    CONSTRAINT fk_stock_presentacion FOREIGN KEY (codigo_presentacion) REFERENCES PRESENTACION(codigo)
);

-- Recreación
CREATE TABLE DETALLE_RECETA (
    id_receta INT NOT NULL, 
    id_farmacia INT NOT NULL, 
    dosis VARCHAR(50) NOT NULL,
    frecuencia VARCHAR(50) NOT NULL,
    duracion VARCHAR(50) NOT NULL,
    PRIMARY KEY (id_receta, id_farmacia),
    CONSTRAINT fk_detalle_receta FOREIGN KEY (id_receta) REFERENCES RECETA(id_receta) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_farmacia FOREIGN KEY (id_farmacia) REFERENCES FARMACIA(id_farmacia)
);
