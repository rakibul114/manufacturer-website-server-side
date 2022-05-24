const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express());


// Root API
app.get('/', (req, res) => {
    res.send('Running Manufacturer Server');
});

// APP listener
app.listen(port, () => {
    console.log('Listening Manufacturer Server to', port);
});