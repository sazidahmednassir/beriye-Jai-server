const express=require('express');
const cors= require('cors')
const jwt = require("jsonwebtoken");
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app= express()

//! Warning: Do not use in production
app.use(
    cors({
      origin: "*",
    })
  );
  
app.use(express.json())

const port=process.env.PORT || 5000;


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0tytznn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

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
  
      //fetch all the package
      app.get("/package", async (req, res) => {
        const packages = await packageCollection .find({}).toArray();
        
        res.send(packages);
       
        });

        app.get("/package/:id", async(req, res)=>{
          const id = req.params.id;
          console.log(id)
          const query = { _id: ObjectId(id) };
          const spack = await packageCollection.findOne(query);
          res.send(spack);
        })
            
        app.put("/users/:email",  async (req, res) => {
          const email = req.params.email;
          const user = req.body;
          console.log(user)
          const filter = { email: email };
          const options = { upsert: true };
          const updateDoc = {
            $set: user,
          };
          const result = await usersCollection.updateOne(filter, updateDoc, options);
          const token = jwt.sign(
            { email: email },
            process.env.ACCESS_TOKEN_SECRET
            
          );
          console.log(result, token)
     
          res.send({ result, token });
        });
  

    app.get("/allusers", async(req, res)=>{

      const users= await usersCollection.find().toArray();
      res.send(users)

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


 


  
  
 

app.listen(port, ()=>{
    console.log(`listening on ${port}`)
})