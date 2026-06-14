--PACIENTES

INSERT INTO PERSONA (id_persona, nombre, apellido, dni, telefono, direccion, sexo, fecha_nacimiento)
VALUES (201, 'Juan', 'Pérez Quispe', '40234567', '958123456', 'Av. De la Cultura 450, Cusco', 'Masculino', '1985-06-15');
INSERT INTO PACIENTE (id_persona, grupo_sanguineo, alergias, peso, altura, contacto_emergencia, antecedentes_medicos, estado_paciente)
VALUES (201, 'O+', 'Ninguna', 78.20, 1.73, 'María Quispe (Esposa) - 958987654', 'Hipertensión arterial controlada', 'Estable');

INSERT INTO PERSONA (id_persona, nombre, apellido, dni, telefono, direccion, sexo, fecha_nacimiento)
VALUES (202, 'María Elena', 'Condori Mamani', '70129843', '984561230', 'Urb. Progreso Cl. Los Rosales B-3', 'Femenino', '1998-11-22');
INSERT INTO PACIENTE (id_persona, grupo_sanguineo, alergias, peso, altura, contacto_emergencia, antecedentes_medicos, estado_paciente)
VALUES (202, 'A-', 'Penicilina, Sulfa', 61.50, 1.62, 'Pedro Condori (Padre) - 984112233', 'Asma bronquial en la infancia', 'En observación');

INSERT INTO PERSONA (id_persona, nombre, apellido, dni, telefono, direccion, sexo, fecha_nacimiento)
VALUES (203, 'Carlos Alejandro', 'Mendoza Vargas', '29654321', '974152637', 'Calle Melgar 104, Arequipa', 'Masculino', '1962-03-08');
INSERT INTO PACIENTE (id_persona, grupo_sanguineo, alergias, peso, altura, contacto_emergencia, antecedentes_medicos, estado_paciente)
VALUES (203, 'B+', 'Ibuprofeno', 85.00, 1.78, 'Luis Mendoza (Hijo) - 974001122', 'Diabetes Tipo 2, Infarto previo en 2022', 'Crítico');

INSERT INTO PERSONA (id_persona, nombre, apellido, dni, telefono, direccion, sexo, fecha_nacimiento)
VALUES (204, 'Ana Lucía', 'Torres Beltrán', '75432109', '961283746', 'Av. El Sol 1210', 'Femenino', '2004-09-02');
INSERT INTO PACIENTE (id_persona, grupo_sanguineo, alergias, peso, altura, contacto_emergencia, antecedentes_medicos, estado_paciente)
VALUES (204, 'O-', 'Polen, Ácaros', 54.00, 1.58, 'Elena Beltrán (Madre) - 961998877', 'Ninguno', 'Estable');

INSERT INTO PERSONA (id_persona, nombre, apellido, dni, telefono, direccion, sexo, fecha_nacimiento)
VALUES (205, 'Jorge Luis', 'Fuentes Ortiz', '09876543', '952364178', 'Jr. San Martín 302', 'Masculino', '1975-07-30');
INSERT INTO PACIENTE (id_persona, grupo_sanguineo, alergias, peso, altura, contacto_emergencia, antecedentes_medicos, estado_paciente)
VALUES (205, 'AB+', 'Ninguna', 92.30, 1.80, 'Sofía Fuentes (Hija) - 952114477', 'Obesidad Grado I', 'Estable');

--PERSONAL MEDICO 

INSERT INTO PERSONA (id_persona, nombre, apellido, dni, telefono, direccion, sexo, fecha_nacimiento)
VALUES (101, 'Ramiro', 'Alana Zegarra', '29432109', '959887766', 'Urb. Yanahuara 200, Arequipa', 'Masculino', '1975-04-12');
INSERT INTO EMPLEADO (id_persona, codigo_empleado, fecha_ingreso, estado_laboral)
VALUES (101, 'EMP-DOC-001', '2010-01-15', 'Activo');
INSERT INTO DOCTOR (id_persona, numero_colegiatura, especialidad)
VALUES (101, 'CMP-44552', 'Cardiología');

INSERT INTO PERSONA (id_persona, nombre, apellido, dni, telefono, direccion, sexo, fecha_nacimiento)
VALUES (102, 'Claudia', 'Peralta Díaz', '41098765', '987112233', 'Av. El Sol 405, Cusco', 'Femenino', '1988-09-25');
INSERT INTO EMPLEADO (id_persona, codigo_empleado, fecha_ingreso, estado_laboral)
VALUES (102, 'EMP-DOC-002', '2018-05-01', 'Activo');
INSERT INTO DOCTOR (id_persona, numero_colegiatura, especialidad)
VALUES (102, 'CMP-66712', 'Medicina General');

--DEPATAMENTO Y CONSULTORIO

INSERT INTO DEPARTAMENTO (id_departamento, nombre, ubicacion) VALUES
(1, 'Cardiología', 'Piso 2 - Ala Norte'),
(2, 'Medicina General', 'Piso 1 - Ala Sur'),
(3, 'Pediatría', 'Piso 1 - Ala Este');
INSERT INTO CONSULTORIO (numero, estado, id_departamento) VALUES
('C-101', 'Disponible', 2),
('C-204', 'Disponible', 1); 

--  CONTRATOS
INSERT INTO CONTRATO (id_contrato, salario, fecha_inicio, fecha_fin, estado, id_empleado) VALUES
(501, 8500.00, '2026-01-01', '2026-12-31', 'Activo', 101),
(502, 5000.00, '2026-01-01', '2026-12-31', 'Activo', 102);

--CITAS Y HITORIAL CLINICO

INSERT INTO CITA (fecha, hora, estado, id_paciente, id_doctor, id_consultorio)
VALUES ('2026-05-26', '08:30:00', 'Completada', 201, 102, 1);

INSERT INTO CITA (fecha, hora, estado, id_paciente, id_doctor, id_consultorio)
VALUES ('2026-05-26', '10:00:00', 'Confirmada', 203, 101, 2);

INSERT INTO HISTORIAL_CLINICO (fecha_creacion, observaciones, id_paciente) VALUES
('2026-05-26', 'Paciente con chequeos generales recurrentes.', 201), 
('2026-05-26', 'Paciente con antecedentes coronarios severos.', 203); 

