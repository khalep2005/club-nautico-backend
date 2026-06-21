const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Las bases de datos en la nube como Supabase exigen conexión segura (SSL)
    ssl: {
        rejectUnauthorized: false
    }
});

// Probamos la conexión nada más arrancar
pool.connect((err, client, release) => {
    if (err) {
        return console.error(' Error al conectar a la base de datos:', err.stack);
    }
    console.log(' Conexión exitosa a la base de datos PostgreSQL en Supabase');
    release();
});

module.exports = pool;