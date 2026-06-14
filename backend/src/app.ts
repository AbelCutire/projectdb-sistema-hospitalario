import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './config/database';
import pacienteRoutes from './routes/pacienteRoutes';
import doctorRoutes from './routes/doctorRoutes';
import citaRoutes from './routes/citaRoutes';
import diagnosticoRoutes from './routes/diagnosticoRoutes';
import farmaciaRoutes from './routes/farmaciaRoutes';
import departamentoRoutes from './routes/departamentoRoutes';
import personaRoutes from './routes/personaRoutes';
import authRoutes from './routes/authRoutes';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRoutes);
app.use('/paciente', pacienteRoutes);
app.use('/doctor', doctorRoutes);
app.use('/cita', citaRoutes);
app.use('/diagnostico', diagnosticoRoutes);
app.use('/farmacia', farmaciaRoutes);
app.use('/departamento', departamentoRoutes);
app.use('/persona', personaRoutes);

app.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'OK',
      message: 'Servidor Express respondiendo y conectado exitosamente a Railway.'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'El servidor responde, pero falló la conexión con la base de datos en Railway.',
      error: error instanceof Error ? error.message : error
    });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Servidor hospitalario escuchando en el puerto ${PORT}`);
});