const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

//! Warning: Do not use in production
app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0tytznn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// app.get('/', async(req, res)=>{
//     res.sendFile("F:/hero/servectg-server/index.html")
// })

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const packageCollection = client.db("beriye").collection("package");
    const usersCollection = client.db("beriye").collection("users");
    const ordersCollection = client.db("beriye").collection("orders");
    const paymentCollection = client.db("beriye").collection("payments");

    //fetch all the package
    app.get("/package", async (req, res) => {
      const packages = await packageCollection.find({}).toArray();

      res.send(packages);
    });
    //FETCH SINGLE PACKAGE
    app.get("/package/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: ObjectId(id) };
      const spack = await packageCollection.findOne(query);
      res.send(spack);
    });

    //UPDATE USERS
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      console.log(user);
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET);
      console.log(result, token);

      res.send({ result, token });
    });

    //FETCH ALL USERS
    app.get("/allusers", verifyJWT, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    //MAKE ADMIN USERS
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        console.log(result);
        res.send(result);
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    });

    //GET ADMIN USERS fetch
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      console.log(isAdmin);
      res.send({ admin: isAdmin });
    });

    //TAKE ORDERS
    app.post("/order", verifyJWT, async (req, res) => {
      const order = req.body;
      console.log(order);
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    //GET ORDERS
    app.get("/orders", verifyJWT, async (req, res) => {
      const user = req.query.user;
      console.log(user);
      const decodedEmail = req.decoded.email;
      console.log(user);
      if (user === decodedEmail) {
        const query = { user: user };
        const orders = await ordersCollection.find(query).toArray();
        console.log(orders);
        return res.send(orders);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });

    //fetch one order
    app.get("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: ObjectId(id) };
      const booking = await ordersCollection.findOne(query);
      console.log(booking);
      res.send(booking);
    });

    //PAYMENT TO STRIPE
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      console.log(service);
      const price = service.price;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: price,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    //update payments
    app.patch('/payment/:id', verifyJWT,  async(req, res)=>{
      const id  = req.params.id;
      const payment = req.body;
      console.log(payment)
      const filter = {_id: ObjectId(id)};
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.payment.transactionId,
          status:payment.status
        }
      }
      const result = await paymentCollection.insertOne(payment.payment);
      const updatedOrder = await ordersCollection.updateOne(filter, updatedDoc);
      // sendPaymentConfirmationEmail(payment.payment)
      res.send(updatedOrder);

    })
  } finally {
  }
}
run().catch(console.dir);

app.get("/dummy-route/user2", async (req, res) => {
  const data = req.body;

  res.json(data);
});

app.get("/", async (req, res) => {
  res.send("Hello");
});

app.listen(port, () => {
  console.log(`listening on ${port}`);
});
