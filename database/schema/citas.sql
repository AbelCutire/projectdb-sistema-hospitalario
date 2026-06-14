
CREATE TABLE CONSULTORIO (
    id_consultorio SERIAL PRIMARY KEY,
    numero VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    id_departamento INT NOT NULL,
    CONSTRAINT fk_consultorio_departamento FOREIGN KEY (id_departamento) REFERENCES DEPARTAMENTO(id_departamento)
);

CREATE TABLE CITA (
    id_cita SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado VARCHAR(20) NOT NULL,
    id_paciente INT NOT NULL,
    id_doctor INT NOT NULL,
    id_consultorio INT NOT NULL,
    CONSTRAINT chk_estado_cita CHECK (estado IN ('Pendiente', 'Confirmada', 'Completada', 'Cancelada')),
    CONSTRAINT fk_cita_paciente FOREIGN KEY (id_paciente) REFERENCES PACIENTE(id_persona),
    CONSTRAINT fk_cita_doctor FOREIGN KEY (id_doctor) REFERENCES DOCTOR(id_persona),
    CONSTRAINT fk_cita_consultorio FOREIGN KEY (id_consultorio) REFERENCES CONSULTORIO(id_consultorio)
);

CREATE TABLE HISTORIAL_CLINICO (
    id_historiaclinica SERIAL PRIMARY KEY,
    fecha_creacion DATE NOT NULL,
    observaciones TEXT NOT NULL,
    id_paciente INT NOT NULL UNIQUE, 
    CONSTRAINT fk_historial_paciente FOREIGN KEY (id_paciente) REFERENCES PACIENTE(id_persona) ON DELETE CASCADE
);

CREATE TABLE DIAGNOSTICO (
    id_diagnostico SERIAL PRIMARY KEY,
    descripcion TEXT NOT NULL, 
    fecha DATE NOT NULL,
    id_paciente INT NOT NULL,
    id_cita INT NOT NULL,
    id_historiaclinica INT NOT NULL,
    CONSTRAINT fk_diag_paciente FOREIGN KEY (id_paciente) REFERENCES PACIENTE(id_persona),
    CONSTRAINT fk_diag_cita FOREIGN KEY (id_cita) REFERENCES CITA(id_cita),
    CONSTRAINT fk_diag_historial FOREIGN KEY (id_historiaclinica) REFERENCES HISTORIAL_CLINICO(id_historiaclinica)
);

CREATE TABLE TRATAMIENTO (
    id_tratamiento SERIAL PRIMARY KEY,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    id_diagnostico INT NOT NULL, 
    CONSTRAINT fk_tratamiento_diagnostico FOREIGN KEY (id_diagnostico) REFERENCES DIAGNOSTICO(id_diagnostico)
);

CREATE TABLE RECETA (
    id_receta SERIAL PRIMARY KEY,
    fecha_emision DATE NOT NULL,
    id_tratamiento INT NOT NULL, 
    CONSTRAINT fk_receta_tratamiento FOREIGN KEY (id_tratamiento) REFERENCES TRATAMIENTO(id_tratamiento)
);
