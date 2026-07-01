import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './config/database';
import pacienteRoutes      from './routes/pacienteRoutes';
import doctorRoutes        from './routes/doctorRoutes';
import citaRoutes          from './routes/citaRoutes';
import diagnosticoRoutes   from './routes/diagnosticoRoutes';
import farmaciaRoutes      from './routes/farmaciaRoutes';
import departamentoRoutes  from './routes/departamentoRoutes';
import personaRoutes       from './routes/personaRoutes';
import authRoutes          from './routes/authRoutes';
import camillaRoutes       from './routes/camillaRoutes';
import recetaRoutes        from './routes/recetaRoutes';
import tratamientoRoutes   from './routes/tratamientoRoutes';
import historialRoutes     from './routes/historialRoutes';
import consultorioRoutes   from './routes/consultorioRoutes';
import solicitudRoutes     from './routes/solicitudRoutes';
import medicamentoRoutes   from './routes/medicamentoRoutes';
import auditoriaRoutes     from './routes/auditoriaRoutes';
import { runSeeder }       from './utils/seeder';
import { authMiddleware }  from './middlewares/authMiddleware';
import { roleMiddleware }  from './middlewares/roleMiddleware';

dotenv.config();

runSeeder();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth',         authRoutes);
app.use('/paciente',     authMiddleware, pacienteRoutes);
app.use('/doctor',       authMiddleware, doctorRoutes);
app.use('/cita',         authMiddleware, citaRoutes);
app.use('/diagnostico',  authMiddleware, diagnosticoRoutes);
app.use('/tratamiento',  authMiddleware, tratamientoRoutes);
app.use('/receta',       authMiddleware, recetaRoutes);
app.use('/historial',    authMiddleware, historialRoutes);
app.use('/consultorio',  authMiddleware, consultorioRoutes);
app.use('/solicitud',    authMiddleware, solicitudRoutes);
app.use('/farmacia',     authMiddleware, farmaciaRoutes);
app.use('/medicamento',  authMiddleware, medicamentoRoutes);
app.use('/departamento', authMiddleware, departamentoRoutes);
app.use('/camilla',      authMiddleware, camillaRoutes);
app.use('/auditoria',    authMiddleware, roleMiddleware('Administrador'), auditoriaRoutes);
app.use('/persona',      authMiddleware, roleMiddleware('Administrador'), personaRoutes);

app.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'OK', message: 'Servidor conectado correctamente.' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: error instanceof Error ? error.message : error });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor hospitalario escuchando en el puerto ${PORT}`);
});