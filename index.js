const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dam4d01.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://cafe-rain.web.app",

    ],
    credentials: true,
  })
);

// middle ware jwt

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if(!token){
    return res.status(401).send({message : 'unauthorized access'})
  }
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
       return res.status(401).send({message : 'unauthorized access'})
      }
      
      req.user = decoded;
      next()
    });
  }
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //   await client.connect();
    const foodsCollections = client.db("cafeRainDB").collection("foodsItems");
    const purchaseCollections = client
      .db("cafeRainDB")
      .collection("purchaseItems");
    const galleryCollections = client.db("cafeRainDB").collection("gallery");
    const usersCollections = client.db("cafeRainDB").collection("users");

    // jwt function

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    // foods
    app.post("/foods", async (req, res) => {
      const data = req.body;
      const doc = {
        ...data,
      };
      const result = await foodsCollections.insertOne(doc);
      res.send(result);
    });

    // all foods
    app.get("/allFoods",async(req,res)=>{
      const {food_name} = req.query;
      const query = {}
      if(food_name){
        query.food_name = {$regex:food_name, $options:"i"};
      }
      const result = await foodsCollections.find(query).toArray()
      res.send(result)
    })


    app.get("/foods", verifyToken, async (req, res) => {
      const { food_name, name, email } = req.query;
      const tokenEmail = req.user.email

      if(tokenEmail !== email){
       return res.status(403).send({message : 'Forbidden access'})
      }
      const query = {};
      if (food_name) {
        query.food_name = { $regex: food_name, $options: "i" };
      }
      if (email) {
        query.added_by = { name: name, email: email };
      }

      const result = await foodsCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/sortFoods", async (req, res) => {
      const result = await foodsCollections
        .find()
        .sort({ purchase_count: -1 })
        .toArray();
      res.send(result);
    });

    app.put("/foods/:id", async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const doc = {
        $set: {
          ...data,
        },
      };
      const result = await foodsCollections.updateOne(query, doc);
      res.send(result);
    });

    app.patch("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;

      // console.log("daa = ",data.quantity,'id : ', id)
      const query = { _id: new ObjectId(id) };
      const doc = {
        $inc: { purchase_count: 1, quantity: -data.quantity },
      };
      const result = await foodsCollections.updateOne(query, doc);
      res.send(result);
    });

    // single foods
    app.get("/foods/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await foodsCollections.findOne(query);
      res.send(result);
    });

    // purchase items
    app.post("/purchaseFoods", async (req, res) => {
      const data = req.body;
      const doc = {
        ...data,
      };
      const result = await purchaseCollections.insertOne(doc);
      res.send(result);
    });

    app.get("/purchaseFoods",verifyToken, async (req, res) => {
      const { email } = req.query;
      const tokenEmail = req.user.email
      if(tokenEmail !== email){
        return res.status(403).send({message:"Forbidden Access"})
      }
      const query = {};
      if (email) {
        query.buyer_Email = email;
      }
      const result = await purchaseCollections.find(query).toArray();
      res.send(result);
    });

    app.delete("/purchaseFoods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await purchaseCollections.deleteOne(query);
      res.send(result);
    });

    // gallery page

    app.get("/gallery", async (req, res) => {
      const result = await galleryCollections.find().toArray();
      res.send(result);
    });

    app.post("/gallery", async (req, res) => {
      const item = req.body;
      const doc = {
        ...item,
      };
      const result = await galleryCollections.insertOne(doc);
      res.send(result);
    });

    // add user collection
    app.post("/users", async (req, res) => {
      const user = req.body;
      const doc = {
        name: user.name,
        email: user.email,
        image: user.image,
      };
      const result = await usersCollections.insertOne(doc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`port is running ${port}`);
});
