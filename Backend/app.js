require("dotenv").config({ path: './config/.env' });
const express = require("express");
const cors = require("cors");
const db = require("./db/connection");
const usersRouter = require("./routes/usersRoutes");
const messagesRouter = require("./routes/messagesRoutes");
const { authenticate } = require("./middleware/authMiddleware");


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', usersRouter);
app.use('/api', messagesRouter);


db.getConnection()
    .then((connection) => {
        console.log('Database connection verified');
        connection.release();
    })
    .catch((err) => {
        console.error('Failed to connect to database:', err.message);
        process.exit(1);
    });

    const PORT = process.env.PORT || 8000;


const server = app.listen(PORT, (err) => {
    if (err) {
        console.error('Error starting the server:', err);
        return;
    }
    console.log(`Server is Running on port ${PORT}`);
});

module.exports = app;
