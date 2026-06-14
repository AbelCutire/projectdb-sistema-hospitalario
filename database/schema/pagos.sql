CREATE TABLE COMPANIA_SEGURO (
    id_compania_seguro SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL
);

CREATE TABLE PAGO (
    id_pago SERIAL PRIMARY KEY,
    fecha_pago DATE NOT NULL,
    monto_total DECIMAL(10,2) NOT NULL,
    monto_cubierto DECIMAL(10,2),
    monto_paciente DECIMAL(10,2) NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL,

    id_paciente INT NOT NULL,
    id_ingreso_hospitalizacion INT NOT NULL,
    id_compania_seguro INT,

    CONSTRAINT fk_pago_paciente FOREIGN KEY (id_paciente) REFERENCES PACIENTE(id_persona),
    CONSTRAINT fk_pago_ingreso FOREIGN KEY (id_ingreso_hospitalizacion) REFERENCES INGRESO_HOSPITALIZACION(id_ingreso_hospitalizacion),
    CONSTRAINT fk_pago_seguro FOREIGN KEY (id_compania_seguro) REFERENCES COMPANIA_SEGURO(id_compania_seguro)
);
