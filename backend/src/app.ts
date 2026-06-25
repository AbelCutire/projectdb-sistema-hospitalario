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
import { runSeeder }       from './utils/seeder';

dotenv.config();

runSeeder();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth',         authRoutes);
app.use('/paciente',     pacienteRoutes);
app.use('/doctor',       doctorRoutes);
app.use('/cita',         citaRoutes);
app.use('/diagnostico',  diagnosticoRoutes);
app.use('/tratamiento',  tratamientoRoutes);
app.use('/receta',       recetaRoutes);
app.use('/historial',    historialRoutes);
app.use('/consultorio',  consultorioRoutes);
app.use('/solicitud',    solicitudRoutes);
app.use('/farmacia',     farmaciaRoutes);
app.use('/departamento', departamentoRoutes);
app.use('/persona',      personaRoutes);
app.use('/camilla',      camillaRoutes);

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