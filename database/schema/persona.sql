CREATE TABLE PERSONA (
    id_persona SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20) NOT NULL UNIQUE,
    telefono VARCHAR(20) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    sexo VARCHAR(20) NOT NULL,
    fecha_nacimiento DATE NOT NULL
);

CREATE TABLE PACIENTE (
    id_persona SERIAL PRIMARY KEY,
    grupo_sanguineo VARCHAR(10) NOT NULL,
    alergias TEXT NOT NULL,
    peso DECIMAL(5,2) NOT NULL,
    altura DECIMAL(4,2) NOT NULL,
    contacto_emergencia VARCHAR(100) NOT NULL,
    antecedentes_medicos TEXT NOT NULL,
    estado_paciente VARCHAR(50) NOT NULL,
    CONSTRAINT fk_paciente_persona FOREIGN KEY (id_persona) REFERENCES PERSONA(id_persona) ON DELETE CASCADE
);

CREATE TABLE EMPLEADO (
    id_persona SERIAL PRIMARY KEY,
    codigo_empleado VARCHAR(50) NOT NULL UNIQUE,
    fecha_ingreso DATE NOT NULL,
    estado_laboral VARCHAR(50) NOT NULL,
    CONSTRAINT fk_empleado_persona FOREIGN KEY (id_persona) REFERENCES PERSONA(id_persona) ON DELETE CASCADE
);

CREATE TABLE DOCTOR (
    id_persona SERIAL PRIMARY KEY,
    numero_colegiatura VARCHAR(50) NOT NULL UNIQUE,
    id_especialidad INT NOT NULL, -- Nueva FK
    CONSTRAINT fk_doctor_empleado FOREIGN KEY (id_persona) REFERENCES EMPLEADO(id_persona) ON DELETE CASCADE,
    CONSTRAINT fk_doctor_especialidad FOREIGN KEY (id_especialidad) REFERENCES ESPECIALIDAD(id_especialidad)
);

CREATE TABLE PERSONAL_LIMPIEZA (
    id_persona SERIAL PRIMARY KEY,
    area_asignada VARCHAR(100) NOT NULL,
    id_turno INT NOT NULL, -- Nueva FK
    CONSTRAINT fk_limpieza_empleado FOREIGN KEY (id_persona) REFERENCES EMPLEADO(id_persona) ON DELETE CASCADE,
    CONSTRAINT fk_limpieza_turno FOREIGN KEY (id_turno) REFERENCES TURNO(id_turno)
);

CREATE TABLE ENFERMERA (
    id_persona SERIAL PRIMARY KEY,
    id_turno INT NOT NULL, -- Nueva FK
    CONSTRAINT fk_enfermera_empleado FOREIGN KEY (id_persona) REFERENCES EMPLEADO(id_persona) ON DELETE CASCADE,
    CONSTRAINT fk_enfermera_turno FOREIGN KEY (id_turno) REFERENCES TURNO(id_turno)
);

CREATE TABLE PERSONAL_ADMINISTRATIVO (
    id_persona SERIAL PRIMARY KEY,
    area_asignada VARCHAR(100) NOT NULL,
    cargo_especifico VARCHAR(100) NOT NULL,
    CONSTRAINT fk_admin_empleado FOREIGN KEY (id_persona) REFERENCES EMPLEADO(id_persona) ON DELETE CASCADE
);

CREATE TABLE CONTRATO (
    id_contrato SERIAL PRIMARY KEY,
    salario DECIMAL(10,2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) NOT NULL,
    id_empleado INT UNIQUE NOT NULL,
    CONSTRAINT fk_contrato_empleado FOREIGN KEY (id_empleado) REFERENCES EMPLEADO(id_persona) ON DELETE CASCADE 
);
