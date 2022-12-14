const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
var nodemailer = require("nodemailer");
var sgTransport = require("nodemailer-sendgrid-transport");
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

var emailSenderOptions = {
  auth: {
    api_key: process.env.EMAIL_SENDER_KEY,
  },
};

const emailClient = nodemailer.createTransport(sgTransport(emailSenderOptions));

function sendCustomPackageConfirmationEmail(cus) {
  const { name, useremail, places, pnumber } = cus;

  var email = {
    from: process.env.EMAIL_SENDER,
    to: useremail,
    subject: `Your Book for ${places} is  taken`,
    text: `Your Order for ${places} is  taken`,
    html: `
    <div>
      <p> Hello ${name}, </p>
      <h3>We contact you through your number  ${pnumber} </h3>
     </div>
  `,
  };

  emailClient.sendMail(email, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      console.log("Message sent: ", info);
    }
  });
}

function sendPaymentConfirmationEmail(payment) {
  const { packageName, user, order, transactionId } = payment;

  var email = {
    from: process.env.EMAIL_SENDER,
    to: user,
    subject: `Your Payment for ${order} is  taken`,
    text: `Your Payment for ${order} is  taken`,
    html: `
    <div>
      <p> Hello , </p>
      <h3>Thank you for your Order . Your Package Name : ${packageName} is Paid </h3>
      <h3>Your Transaction id ${transactionId} & your Order id ${order}</h3>
      
      
      <p>we will contact through your email</p>
      
      
    </div>
  `,
  };

  emailClient.sendMail(email, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      console.log("Message sent: ", info);
    }
  });
}

async function run() {
  try {
    await client.connect();
    const packageCollection = client.db("beriye").collection("package");
    const usersCollection = client.db("beriye").collection("users");
    const ordersCollection = client.db("beriye").collection("orders");
    const paymentCollection = client.db("beriye").collection("payments");
    const customCollection = client.db("beriye").collection("custom");
    const visitCollection = client.db("beriye").collection("visit");
    const reviewCollection = client.db("beriye").collection("reviews");
    const studyCollection = client.db("beriye").collection("study");
    const corporateCollection = client.db("beriye").collection("corporate");
    const placeCollection = client.db("beriye").collection("places");

    // verify ADMIN FUNCTION
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

    //fetch all places
    app.get("/place", async (req, res) => {
      const place = await placeCollection.find({}).toArray();

      res.send(place);
    });

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
    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      console.log(result);
      res.send(result);
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

    //get vistable place
    app.get("/visit", async (req, res) => {
      const visit = await visitCollection.find().toArray();

      res.send(visit);
    });
    //get vistable place by id
    app.get("/visit/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: ObjectId(id) };
      const visit = await visitCollection.findOne(query);
      console.log(visit);
      res.send(visit);
    });

    //add package
    app.post("/add-package", verifyJWT, async (req, res) => {
      const package = req.body;
      console.log(package);
      const result = await packageCollection.insertOne(package);
      res.send(result);
    });

    //custom package route
    app.post("/cus", verifyJWT, async (req, res) => {
      const cuspackage = req.body;
      console.log(cuspackage);
      const result = await customCollection.insertOne(cuspackage);
      console.log(result);
      sendCustomPackageConfirmationEmail(cuspackage);
      res.send(result);
    });

    //update user
    app.put("/update-user", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const filter = { email: email };
      const data = req.body;
      const updateDoc = {
        $set: {
          name: req.body.name,
          img: req.body.img,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      console.log(result);
      res.send(result);
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

    //add review
    app.post("/review", verifyJWT, async (req, res) => {
      const review = req.body;
      console.log(review);
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    //get reviews

    app.get("/reviews", async (req, res) => {
      const limit = Number(req.query.limit);
      const cursor = reviewCollection.find();

      const result = await cursor.limit(limit).toArray();

      res.send(result);
    });

    //get study api
    app.get("/study", async (req, res) => {
      const study = await studyCollection.find().toArray();

      res.send(study);
    });

    //get corporate api
    app.get("/corpor", async (req, res) => {
      const result = await corporateCollection.find().toArray();

      res.send(result);
    });

    //update payments
    app.patch("/payment/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      console.log(payment);
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.payment.transactionId,
          status: payment.status,
        },
      };
      const result = await paymentCollection.insertOne(payment.payment);
      const updatedOrder = await ordersCollection.updateOne(filter, updatedDoc);
      sendPaymentConfirmationEmail(payment.payment);
      res.send(updatedOrder);
    });
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
