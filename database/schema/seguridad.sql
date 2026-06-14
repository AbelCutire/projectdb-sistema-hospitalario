-- seguridad.sql

CREATE TABLE ROL (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE USUARIO (
    id_usuario SERIAL PRIMARY KEY,
    id_persona INT UNIQUE NOT NULL, -- Conexión 1 a 1 con la persona física
    id_rol INT NOT NULL,            -- Qué permisos tiene
    correo_institucional VARCHAR(100) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    estado_activo BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_usuario_persona FOREIGN KEY (id_persona) REFERENCES PERSONA(id_persona) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES ROL(id_rol)
);

CREATE TABLE AUDITORIA (
    id_auditoria SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    tabla_afectada VARCHAR(50) NOT NULL,
    accion_realizada VARCHAR(50) NOT NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descripcion_cambio TEXT,
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario)
);
