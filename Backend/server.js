const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.SERVER_PORT || 5000;

// Configuración de seguridad y middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));  // Deshabilitar extended para mayor seguridad
app.use(cookieParser());

// Límites para prevenir DoS
app.use(bodyParser.json({limit: '10kb'}));  // Limitar tamaño del payload

// Importar conexión a MySQL (se mostrará en consola al iniciar)
const db = require('./config/database');

// Importar rutas
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');

// ✅ USAR RUTAS DESPUÉS de los middlewares - CORREGIDO
app.use('/api/tareas', taskRoutes);  // ✅ CORREGIDO: /api/tareas
app.use('/api/auth', authRoutes);    // ✅ Correcto: /api/auth

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Backend de TaskWeb funcionando!',
        database: 'MySQL conectado correctamente',
        timestamp: new Date().toISOString()
    });
});

// Ruta para probar conexión a BD
app.get('/api/db-status', (req, res) => {
    db.query('SELECT 1 + 1 AS result', (err, results) => {
        if (err) {
            return res.status(500).json({
                status: 'error',
                message: 'Error en la base de datos'
            });
        }
        res.json({
            status: 'success',
            message: 'Conexión a MySQL exitosa',
            result: results[0].result
        });
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎯 Servidor Express ejecutándose:`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🕐 Iniciado: ${new Date().toLocaleString()}`);
    console.log(`📡 Entorno: ${process.env.NODE_ENV || 'development'}`);
});