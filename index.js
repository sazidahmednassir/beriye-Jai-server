const express=require('express');
const cors= require('cors')
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

async function run() {
    try {
      await client.connect();
      const packageCollection = client.db("beriye").collection("package");
  
      app.get("/package", async (req, res) => {
        const services = await packageCollection .find({}).toArray();
        console.log(services);
        res.send(services);

         //* With try catch block

    // app.post("/add-service", async (req, res) => {
    //   try {
    //     const data = req.body;
    //     const result = await servicesCollection.insertOne(data);
    //     res.send({ status: true, result: result });
    //   } catch (error) {
    //     res.send({ status: false, error });
    //   }
    // });

        app.post("/add-service", async (req, res) => {
          const data = req.body;
          const result = await servicesCollection.insertOne(data);
          res.send(result);
        });

        app.put("/update-service/:id", async (req, res) => {
          const { id } = req.params;
          const data = req.body;
    
          const filter = { _id: ObjectId(id) };
          const updateDoc = { $set: data };
          const option = { upsert: true };
    
          const result = await servicesCollection.updateOne(
            filter,
            updateDoc,
            option
          );
    
          res.send(result);
        });
      });

      app.delete("/delete-service/:id", async (req, res) => {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const result = await servicesCollection.deleteOne(query);
  
        res.send(result);
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


  app.get("/dummy-route/user", async (req, res) => {
    const { name, age } = req.query;
    console.log(name);
    console.log(age);
    res.json(name);
  });


  app.get("/user/:id", async (req, res) => {
    const { id } = req.params;
  
    res.json(id);
  });
  
 

app.listen(port, ()=>{
    console.log(`listening on ${port}`)
})