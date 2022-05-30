const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(
  "sk_test_51L0dqOCPAFEm2DliblQumT5i0xxZJ1LyZstBikz9dgbH3CaFg53OAmgD9R8PCnQCKcgJkdno9sHSeFRJv1WJaoCF00Ro3NMCkW"
);

const app = express();

const port = process.env.PORT || 5000;



// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6rxra.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verify jwt token
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
    req.decoded = decoded;
    next();
  });
}


async function run() {
    try {
      await client.connect();
      // MongoDB connection
      const toolCollection = client.db("toolsManufacturer").collection("tool");
      const orderCollection = client
        .db("toolsManufacturer")
        .collection("order");
      const userCollection = client.db("toolsManufacturer").collection("users");
      const paymentCollection = client
        .db("toolsManufacturer")
        .collection("payments");

      // Get all tools data
      app.get("/tool", async (req, res) => {
        const query = {};
        const cursor = toolCollection.find(query).project({name: 1});
        const tools = await cursor.toArray();
        res.send(tools);
      });

      // Get single tool data
      app.get("/tool/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const tool = await toolCollection.findOne(query);
        res.send(tool);
      });

      // function to Verify Admin
      const verifyAdmin = async (req, res, next) => {
        const requester = req.decoded.email;
        const requesterAccount = await userCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          next();
        } else {
          res.status(403).send({ message: "forbidden" });
        }
      };

      // get all users from database
      app.get("/user", verifyJWT, async (req, res) => {
        const users = await userCollection.find().toArray();
        res.send(users);
      });

      // get admin email
      app.get("/admin/:email", async (req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email: email });
        const isAdmin = user.role === "admin";
        res.send({ admin: isAdmin });
      });

      // to make an user admin
      app.put(
        "/user/admin/:email",
        verifyJWT,
        verifyAdmin,
        async (req, res) => {
          const email = req.params.email;

          const filter = { email: email };
          const updateDoc = {
            $set: { role: "admin" },
          };
          const result = await userCollection.updateOne(filter, updateDoc);
          res.send(result);
        }
      );

      // update or add a new registered user
      app.put("/user/:email", async (req, res) => {
        const email = req.params.email;
        const user = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
        };
        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        const token = jwt.sign(
          { email: email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "1h" }
        );
        res.send({ result, token });
      });

      // Order Collection API
      // get order
      app.get("/order", verifyJWT, async (req, res) => {
        const email = req.query.email;
        const decodedEmail = req.decoded.email;
        if (email === decodedEmail) {
          const query = { email: email };
          const orders = await orderCollection.find(query).toArray();
          res.send(orders);
        } else {
          return res.status(403).send({ message: "forbidden access" });
        }
      });

      // get order by id
      app.get("/order/:id", verifyJWT, async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const order = await orderCollection.findOne(query);
        res.send(order);
      });

      // POST API for payment
      app.post("/create-payment-intent", verifyJWT, async (req, res) => {
        const tool = req.body;
        const price = tool.price;
        const amount = price * 100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"]
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      });

      // update payment
      app.patch("/order/:id", verifyJWT, async (req, res) => {
        const id = req.params.id;
        const payment = req.body;
        const filter = { _id: ObjectId(id) };
        const updatedDoc = {
          $set: {
            paid: true,
            transactionId: payment.transactionId
          },
        };
        const result = await paymentCollection.insertOne(payment);
        const updatedOrder = await orderCollection.updateOne(
          filter,
          updatedDoc
        );
        res.send(updatedOrder);
      });

      // post order
      app.post("/order", async (req, res) => {
        const order = req.body;
        const result = await orderCollection.insertOne(order);
        res.send(result);
      });

      // delete order
      app.delete("/order/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await orderCollection.deleteOne(query);
        res.send(result);
      });
    }
    finally {
        
    }
}

run().catch(console.dir);



// Root API
app.get('/', (req, res) => {
    res.send('Running Manufacturer Server');
});

// APP listener
app.listen(port, () => {
    console.log('Listening Manufacturer Server to', port);
});