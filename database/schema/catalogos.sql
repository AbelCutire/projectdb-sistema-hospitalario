-- catalogos.sql

CREATE TABLE ESPECIALIDAD (
    id_especialidad SERIAL PRIMARY KEY,
    nombre_especialidad VARCHAR(100) NOT NULL UNIQUE,
    descripcion_especialidad TEXT
);

CREATE TABLE TURNO (
    id_turno SERIAL PRIMARY KEY,
    nombre_turno VARCHAR(50) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    dias_laborables VARCHAR(100) NOT NULL
);
