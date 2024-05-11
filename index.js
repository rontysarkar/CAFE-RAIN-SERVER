const express = require('express');
const cors = require('cors')
require ('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dam4d01.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const app = express()
const port = process.env.PORT || 5000;

app.use(express.json())
app.use(
    cors({
      origin: [
        "http://localhost:5173",
        
      ],
      credentials: true,
    })
  );

  



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
    //   await client.connect();
        const foodsCollections = client.db('cafeRainDB').collection('foodsItems');
        const purchaseCollections = client.db('cafeRainDB').collection('purchaseItems');
        const galleryCollections = client.db('cafeRainDB').collection('gallery');

        app.get('/foods',async(req,res)=>{
            const {food_name} = req.query
            const query = {}
            if(food_name){
              query.food_name = { $regex : food_name,$options:'i'};
            }
            const result =await foodsCollections.find(query).toArray()
            res.send(result)
        })

        // single foods 
        app.get('/foods/:id',async(req,res)=>{
           const query = {_id: new ObjectId(req.params.id)}
           const result = await foodsCollections.findOne(query)
           res.send(result)
        })

        // purchase items
        app.post('/purchaseFoods',async(req,res)=>{
          const data = req.body
          console.log(data)
          const doc = {
            ...data
          }
          const result = await purchaseCollections.insertOne(doc);
          res.send(result)
        })

        // gallery page

        app.get('/gallery',async(req,res)=>{
          const result = await galleryCollections.find().toArray()
          res.send(result)
        })




      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
    //   await client.close();
    }
  }
  run().catch(console.dir);










app.get('/',(req,res)=>{
    res.send('server is running')
})

app.listen(port,()=>{
    console.log(`port is running ${port}`)
})