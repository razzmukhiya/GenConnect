const mysql2 = require("mysql2");
require("dotenv").config('../config/.env');

let connectionParams;

// Default to localhost if not set
const useLocalhost = process.env.USE_LOCALHOST === 'true' || !process.env.DB_SERVER_HOST;

// Use defaults if env vars not set
const dbUser = process.env.DB_SERVER_USER || 'root';
const dbHost = process.env.DB_SERVER_HOST || 'localhost';
// const dbPort = process.env.DB_SERVER_PORT || 3306;
const dbPassword = process.env.DB_SERVER_PASSWORD || '';
const dbDatabase = process.env.DB_SERVER_DATABASE || 'genconnect';

console.log("Loading database configuration...");
console.log("USE_LOCALHOST:", useLocalhost);
console.log("DB_SERVER_USER:", dbUser);
console.log("DB_SERVER_HOST:", dbHost);
console.log("DB_SERVER_DATABASE:", dbDatabase);

if(useLocalhost) {
    console.log("Using local database configuration");
    connectionParams = {
        user: dbUser,
        host: dbHost,
        // port: dbPort,
        password: dbPassword,
        database: dbDatabase,
    };
} else {
    connectionParams = {
        user: dbUser,
        host: dbHost,
        password: dbPassword,
        database: dbDatabase,
    };
}

const pool = mysql2.createPool(connectionParams);

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    } else {
        console.log("Database connection established successfully");
        connection.release();
    }
});

module.exports = pool.promise();
