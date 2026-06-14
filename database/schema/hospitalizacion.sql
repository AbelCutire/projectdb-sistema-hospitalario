CREATE TABLE SALA (
    id_sala SERIAL PRIMARY KEY,
    tipo_sala VARCHAR(20) NOT NULL,
    id_departamento INT NOT NULL,
    CONSTRAINT fk_sala_departamento FOREIGN KEY (id_departamento) REFERENCES DEPARTAMENTO(id_departamento)

);

CREATE TABLE CAMILLA (
    id_camilla SERIAL PRIMARY KEY,
    estado VARCHAR(20) NOT NULL,

    id_sala INT NOT NULL,
    CONSTRAINT fk_camilla_sala FOREIGN KEY (id_sala) REFERENCES SALA(id_sala)

);

CREATE TABLE INGRESO_HOSPITALIZACION (
    id_ingreso_hospitalizacion SERIAL PRIMARY KEY,
    fecha_ingreso DATE NOT NULL, 
    fecha_alta DATE NOT NULL, 

    id_paciente INT NOT NULL,
    id_camilla INT NOT NULL,
    CONSTRAINT fk_ingreso_paciente FOREIGN KEY (id_paciente) REFERENCES PACIENTE(id_persona),
    CONSTRAINT fk_ingreso_camilla FOREIGN KEY (id_camilla) REFERENCES CAMILLA(id_camilla)
);
