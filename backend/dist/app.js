"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const pacienteRoutes_1 = __importDefault(require("./routes/pacienteRoutes"));
const doctorRoutes_1 = __importDefault(require("./routes/doctorRoutes"));
const citaRoutes_1 = __importDefault(require("./routes/citaRoutes"));
const diagnosticoRoutes_1 = __importDefault(require("./routes/diagnosticoRoutes"));
const farmaciaRoutes_1 = __importDefault(require("./routes/farmaciaRoutes"));
const departamentoRoutes_1 = __importDefault(require("./routes/departamentoRoutes"));
const personaRoutes_1 = __importDefault(require("./routes/personaRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/auth', authRoutes_1.default);
app.use('/paciente', pacienteRoutes_1.default);
app.use('/doctor', doctorRoutes_1.default);
app.use('/cita', citaRoutes_1.default);
app.use('/diagnostico', diagnosticoRoutes_1.default);
app.use('/farmacia', farmaciaRoutes_1.default);
app.use('/departamento', departamentoRoutes_1.default);
app.use('/persona', personaRoutes_1.default);
app.get('/health', async (req, res) => {
    try {
        await database_1.default.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: 'OK',
            message: 'Servidor Express respondiendo y conectado exitosamente a Railway.'
        });
    }
    catch (error) {
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
