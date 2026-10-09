-- CreateTable
CREATE TABLE "camilla" (
    "id_camilla" SERIAL NOT NULL,
    "estado" VARCHAR(20) NOT NULL,
    "id_sala" INTEGER NOT NULL,

    CONSTRAINT "camilla_pkey" PRIMARY KEY ("id_camilla")
);

-- CreateTable
CREATE TABLE "cita" (
    "id_cita" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TIME(6) NOT NULL,
    "estado" VARCHAR(20) NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "id_doctor" INTEGER NOT NULL,
    "id_consultorio" INTEGER NOT NULL,

    CONSTRAINT "cita_pkey" PRIMARY KEY ("id_cita")
);

-- CreateTable
CREATE TABLE "compania_seguro" (
    "id_compania_seguro" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(20) NOT NULL,

    CONSTRAINT "compania_seguro_pkey" PRIMARY KEY ("id_compania_seguro")
);

-- CreateTable
CREATE TABLE "consultorio" (
    "id_consultorio" SERIAL NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "estado" VARCHAR(20) NOT NULL,
    "id_departamento" INTEGER NOT NULL,

    CONSTRAINT "consultorio_pkey" PRIMARY KEY ("id_consultorio")
);

-- CreateTable
CREATE TABLE "contrato" (
    "id_contrato" SERIAL NOT NULL,
    "salario" DECIMAL(10,2) NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" VARCHAR(20) NOT NULL,
    "id_empleado" INTEGER NOT NULL,

    CONSTRAINT "contrato_pkey" PRIMARY KEY ("id_contrato")
);

-- CreateTable
CREATE TABLE "departamento" (
    "id_departamento" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "ubicacion" VARCHAR(100) NOT NULL,

    CONSTRAINT "departamento_pkey" PRIMARY KEY ("id_departamento")
);

-- CreateTable
CREATE TABLE "diagnostico" (
    "id_diagnostico" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "id_cita" INTEGER NOT NULL,
    "id_historiaclinica" INTEGER NOT NULL,

    CONSTRAINT "diagnostico_pkey" PRIMARY KEY ("id_diagnostico")
);

-- CreateTable
CREATE TABLE "doctor" (
    "id_persona" SERIAL NOT NULL,
    "numero_colegiatura" VARCHAR(50) NOT NULL,
    "id_especialidad" INTEGER NOT NULL,

    CONSTRAINT "doctor_pkey" PRIMARY KEY ("id_persona")
);

-- CreateTable
CREATE TABLE "empleado" (
    "id_persona" SERIAL NOT NULL,
    "codigo_empleado" VARCHAR(50) NOT NULL,
    "fecha_ingreso" DATE NOT NULL,
    "estado_laboral" VARCHAR(50) NOT NULL,

    CONSTRAINT "empleado_pkey" PRIMARY KEY ("id_persona")
);

-- CreateTable
CREATE TABLE "enfermera" (
    "id_persona" SERIAL NOT NULL,
    "id_turno" INTEGER NOT NULL,

    CONSTRAINT "enfermera_pkey" PRIMARY KEY ("id_persona")
);

-- CreateTable
CREATE TABLE "historial_clinico" (
    "id_historiaclinica" SERIAL NOT NULL,
    "fecha_creacion" DATE NOT NULL,
    "observaciones" TEXT NOT NULL,
    "id_paciente" INTEGER NOT NULL,

    CONSTRAINT "historial_clinico_pkey" PRIMARY KEY ("id_historiaclinica")
);

-- CreateTable
CREATE TABLE "ingreso_hospitalizacion" (
    "id_ingreso_hospitalizacion" SERIAL NOT NULL,
    "fecha_ingreso" DATE NOT NULL,
    "fecha_alta" DATE NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "id_camilla" INTEGER NOT NULL,

    CONSTRAINT "ingreso_hospitalizacion_pkey" PRIMARY KEY ("id_ingreso_hospitalizacion")
);

-- CreateTable
CREATE TABLE "paciente" (
    "id_persona" SERIAL NOT NULL,
    "grupo_sanguineo" VARCHAR(10) NOT NULL,
    "alergias" TEXT NOT NULL,
    "peso" DECIMAL(5,2) NOT NULL,
    "altura" DECIMAL(4,2) NOT NULL,
    "contacto_emergencia" VARCHAR(100) NOT NULL,
    "antecedentes_medicos" TEXT NOT NULL,
    "estado_paciente" VARCHAR(50) NOT NULL,

    CONSTRAINT "paciente_pkey" PRIMARY KEY ("id_persona")
);

-- CreateTable
CREATE TABLE "pago" (
    "id_pago" SERIAL NOT NULL,
    "fecha_pago" DATE NOT NULL,
    "monto_total" DECIMAL(10,2) NOT NULL,
    "monto_cubierto" DECIMAL(10,2),
    "monto_paciente" DECIMAL(10,2) NOT NULL,
    "metodo_pago" VARCHAR(50) NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "id_ingreso_hospitalizacion" INTEGER NOT NULL,
    "id_compania_seguro" INTEGER,

    CONSTRAINT "pago_pkey" PRIMARY KEY ("id_pago")
);

-- CreateTable
CREATE TABLE "persona" (
    "id_persona" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "dni" VARCHAR(20) NOT NULL,
    "telefono" VARCHAR(20) NOT NULL,
    "direccion" VARCHAR(255) NOT NULL,
    "sexo" VARCHAR(20) NOT NULL,
    "fecha_nacimiento" DATE NOT NULL,

    CONSTRAINT "persona_pkey" PRIMARY KEY ("id_persona")
);

-- CreateTable
CREATE TABLE "personal_limpieza" (
    "id_persona" SERIAL NOT NULL,
    "area_asignada" VARCHAR(100) NOT NULL,
    "id_turno" INTEGER NOT NULL,

    CONSTRAINT "personal_limpieza_pkey" PRIMARY KEY ("id_persona")
);

-- CreateTable
CREATE TABLE "receta" (
    "id_receta" SERIAL NOT NULL,
    "fecha_emision" DATE NOT NULL,
    "id_tratamiento" INTEGER NOT NULL,

    CONSTRAINT "receta_pkey" PRIMARY KEY ("id_receta")
);

-- CreateTable
CREATE TABLE "sala" (
    "id_sala" SERIAL NOT NULL,
    "tipo_sala" VARCHAR(20) NOT NULL,
    "id_departamento" INTEGER NOT NULL,

    CONSTRAINT "sala_pkey" PRIMARY KEY ("id_sala")
);

-- CreateTable
CREATE TABLE "tratamiento" (
    "id_tratamiento" SERIAL NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "id_diagnostico" INTEGER NOT NULL,

    CONSTRAINT "tratamiento_pkey" PRIMARY KEY ("id_tratamiento")
);

-- CreateTable
CREATE TABLE "accion_terapeutica" (
    "id_accion_terapeutica" SERIAL NOT NULL,
    "tipo" VARCHAR(100) NOT NULL,

    CONSTRAINT "accion_terapeutica_pkey" PRIMARY KEY ("id_accion_terapeutica")
);

-- CreateTable
CREATE TABLE "detalle_receta" (
    "id_receta" INTEGER NOT NULL,
    "id_farmacia" INTEGER NOT NULL,
    "dosis" VARCHAR(50) NOT NULL,
    "frecuencia" VARCHAR(50) NOT NULL,
    "duracion" VARCHAR(50) NOT NULL,

    CONSTRAINT "detalle_receta_pkey" PRIMARY KEY ("id_receta","id_farmacia")
);

-- CreateTable
CREATE TABLE "farmacia" (
    "id_farmacia" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "stock" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "farmacia_pkey" PRIMARY KEY ("id_farmacia")
);

-- CreateTable
CREATE TABLE "laboratorio_produccion" (
    "codigo" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),

    CONSTRAINT "laboratorio_produccion_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "medicamento" (
    "codigo" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "id_accion_terapeutica" INTEGER NOT NULL,
    "id_monodroga" INTEGER NOT NULL,
    "codigo_laboratorio" INTEGER NOT NULL,

    CONSTRAINT "medicamento_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "monodroga" (
    "id_monodroga" SERIAL NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,

    CONSTRAINT "monodroga_pkey" PRIMARY KEY ("id_monodroga")
);

-- CreateTable
CREATE TABLE "presentacion" (
    "codigo" SERIAL NOT NULL,
    "descripcion" VARCHAR(100) NOT NULL,
    "unidad" VARCHAR(50) NOT NULL,

    CONSTRAINT "presentacion_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "stock" (
    "item" SERIAL NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "id_farmacia" INTEGER NOT NULL,
    "codigo_medicamento" INTEGER NOT NULL,
    "codigo_presentacion" INTEGER NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("item")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id_auditoria" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "tabla_afectada" VARCHAR(50) NOT NULL,
    "accion_realizada" VARCHAR(50) NOT NULL,
    "fecha_hora" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "descripcion_cambio" TEXT,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateTable
CREATE TABLE "especialidad" (
    "id_especialidad" SERIAL NOT NULL,
    "nombre_especialidad" VARCHAR(100) NOT NULL,
    "descripcion_especialidad" TEXT,

    CONSTRAINT "especialidad_pkey" PRIMARY KEY ("id_especialidad")
);

-- CreateTable
CREATE TABLE "personal_administrativo" (
    "id_persona" SERIAL NOT NULL,
    "area_asignada" VARCHAR(100) NOT NULL,
    "cargo_especifico" VARCHAR(100) NOT NULL,

    CONSTRAINT "personal_administrativo_pkey" PRIMARY KEY ("id_persona")
);

-- CreateTable
CREATE TABLE "rol" (
    "id_rol" SERIAL NOT NULL,
    "nombre_rol" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "turno" (
    "id_turno" SERIAL NOT NULL,
    "nombre_turno" VARCHAR(50) NOT NULL,
    "hora_inicio" TIME(6) NOT NULL,
    "hora_fin" TIME(6) NOT NULL,
    "dias_laborables" VARCHAR(100) NOT NULL,

    CONSTRAINT "turno_pkey" PRIMARY KEY ("id_turno")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "id_persona" INTEGER NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "correo_institucional" VARCHAR(100) NOT NULL,
    "contrasena_hash" VARCHAR(255) NOT NULL,
    "estado_activo" BOOLEAN DEFAULT true,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateIndex
CREATE UNIQUE INDEX "contrato_id_empleado_key" ON "contrato"("id_empleado");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_numero_colegiatura_key" ON "doctor"("numero_colegiatura");

-- CreateIndex
CREATE UNIQUE INDEX "empleado_codigo_empleado_key" ON "empleado"("codigo_empleado");

-- CreateIndex
CREATE UNIQUE INDEX "historial_clinico_id_paciente_key" ON "historial_clinico"("id_paciente");

-- CreateIndex
CREATE UNIQUE INDEX "persona_dni_key" ON "persona"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "especialidad_nombre_especialidad_key" ON "especialidad"("nombre_especialidad");

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombre_rol_key" ON "rol"("nombre_rol");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_id_persona_key" ON "usuario"("id_persona");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_institucional_key" ON "usuario"("correo_institucional");

-- AddForeignKey
ALTER TABLE "camilla" ADD CONSTRAINT "fk_camilla_sala" FOREIGN KEY ("id_sala") REFERENCES "sala"("id_sala") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cita" ADD CONSTRAINT "fk_cita_consultorio" FOREIGN KEY ("id_consultorio") REFERENCES "consultorio"("id_consultorio") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cita" ADD CONSTRAINT "fk_cita_doctor" FOREIGN KEY ("id_doctor") REFERENCES "doctor"("id_persona") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cita" ADD CONSTRAINT "fk_cita_paciente" FOREIGN KEY ("id_paciente") REFERENCES "paciente"("id_persona") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultorio" ADD CONSTRAINT "fk_consultorio_departamento" FOREIGN KEY ("id_departamento") REFERENCES "departamento"("id_departamento") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "fk_contrato_empleado" FOREIGN KEY ("id_empleado") REFERENCES "empleado"("id_persona") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostico" ADD CONSTRAINT "fk_diag_cita" FOREIGN KEY ("id_cita") REFERENCES "cita"("id_cita") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostico" ADD CONSTRAINT "fk_diag_historial" FOREIGN KEY ("id_historiaclinica") REFERENCES "historial_clinico"("id_historiaclinica") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostico" ADD CONSTRAINT "fk_diag_paciente" FOREIGN KEY ("id_paciente") REFERENCES "paciente"("id_persona") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "doctor" ADD CONSTRAINT "fk_doctor_empleado" FOREIGN KEY ("id_persona") REFERENCES "empleado"("id_persona") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "doctor" ADD CONSTRAINT "fk_doctor_especialidad" FOREIGN KEY ("id_especialidad") REFERENCES "especialidad"("id_especialidad") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "empleado" ADD CONSTRAINT "fk_empleado_persona" FOREIGN KEY ("id_persona") REFERENCES "persona"("id_persona") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enfermera" ADD CONSTRAINT "fk_enfermera_empleado" FOREIGN KEY ("id_persona") REFERENCES "empleado"("id_persona") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enfermera" ADD CONSTRAINT "fk_enfermera_turno" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "historial_clinico" ADD CONSTRAINT "fk_historial_paciente" FOREIGN KEY ("id_paciente") REFERENCES "paciente"("id_persona") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ingreso_hospitalizacion" ADD CONSTRAINT "fk_ingreso_camilla" FOREIGN KEY ("id_camilla") REFERENCES "camilla"("id_camilla") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ingreso_hospitalizacion" ADD CONSTRAINT "fk_ingreso_paciente" FOREIGN KEY ("id_paciente") REFERENCES "paciente"("id_persona") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "fk_paciente_persona" FOREIGN KEY ("id_persona") REFERENCES "persona"("id_persona") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "fk_pago_ingreso" FOREIGN KEY ("id_ingreso_hospitalizacion") REFERENCES "ingreso_hospitalizacion"("id_ingreso_hospitalizacion") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "fk_pago_paciente" FOREIGN KEY ("id_paciente") REFERENCES "paciente"("id_persona") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "fk_pago_seguro" FOREIGN KEY ("id_compania_seguro") REFERENCES "compania_seguro"("id_compania_seguro") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "personal_limpieza" ADD CONSTRAINT "fk_limpieza_empleado" FOREIGN KEY ("id_persona") REFERENCES "empleado"("id_persona") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "personal_limpieza" ADD CONSTRAINT "fk_limpieza_turno" FOREIGN KEY ("id_turno") REFERENCES "turno"("id_turno") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "receta" ADD CONSTRAINT "fk_receta_tratamiento" FOREIGN KEY ("id_tratamiento") REFERENCES "tratamiento"("id_tratamiento") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sala" ADD CONSTRAINT "fk_sala_departamento" FOREIGN KEY ("id_departamento") REFERENCES "departamento"("id_departamento") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tratamiento" ADD CONSTRAINT "fk_tratamiento_diagnostico" FOREIGN KEY ("id_diagnostico") REFERENCES "diagnostico"("id_diagnostico") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_receta" ADD CONSTRAINT "fk_detalle_farmacia" FOREIGN KEY ("id_farmacia") REFERENCES "farmacia"("id_farmacia") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_receta" ADD CONSTRAINT "fk_detalle_receta" FOREIGN KEY ("id_receta") REFERENCES "receta"("id_receta") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "medicamento" ADD CONSTRAINT "fk_med_accion" FOREIGN KEY ("id_accion_terapeutica") REFERENCES "accion_terapeutica"("id_accion_terapeutica") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "medicamento" ADD CONSTRAINT "fk_med_lab" FOREIGN KEY ("codigo_laboratorio") REFERENCES "laboratorio_produccion"("codigo") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "medicamento" ADD CONSTRAINT "fk_med_monodroga" FOREIGN KEY ("id_monodroga") REFERENCES "monodroga"("id_monodroga") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "fk_stock_farmacia" FOREIGN KEY ("id_farmacia") REFERENCES "farmacia"("id_farmacia") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "fk_stock_medicamento" FOREIGN KEY ("codigo_medicamento") REFERENCES "medicamento"("codigo") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "fk_stock_presentacion" FOREIGN KEY ("codigo_presentacion") REFERENCES "presentacion"("codigo") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "fk_auditoria_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "personal_administrativo" ADD CONSTRAINT "fk_admin_empleado" FOREIGN KEY ("id_persona") REFERENCES "empleado"("id_persona") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "fk_usuario_persona" FOREIGN KEY ("id_persona") REFERENCES "persona"("id_persona") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "fk_usuario_rol" FOREIGN KEY ("id_rol") REFERENCES "rol"("id_rol") ON DELETE NO ACTION ON UPDATE NO ACTION;
