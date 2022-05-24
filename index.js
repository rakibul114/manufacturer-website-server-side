const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require("mongodb");
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express());


// MongoDB connection


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6rxra.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
client.connect((err) => {
    const collection = client.db("test").collection("devices");
    console.log('Manufacturer connected');
  // perform actions on the collection object
  client.close();
});





// Root API
app.get('/', (req, res) => {
    res.send('Running Manufacturer Server');
});

// APP listener
app.listen(port, () => {
    console.log('Listening Manufacturer Server to', port);
});