require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build (dist) or public for development
if (fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static('dist'));
} else {
    app.use(express.static('public'));
}

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Legacy proxy route for compatibility if needed (simplified)
app.post('/api/chat', async (req, res) => {
    res.status(501).json({ error: "AI proxy is deprecated. Use local data instead." });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
