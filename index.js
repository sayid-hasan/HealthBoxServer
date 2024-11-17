const express = require("express");
const cors = require("cors");

require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
// console.log(process.env.DB_USER);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.grteoyu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    // database collection
    const categoriesCollection = client
      .db("HealthBox")
      .collection("categories");
    const medicinesCollection = client
      .db("HealthBox")
      .collection("allmedicine");

    // apis
    //top categories
    app.get("/top-categories", async (req, res) => {
      // Fetch the top 6 selling food items based on purchaseCount
      const topCatergories = await categoriesCollection
        .find()
        .sort({ medicineCount: -1 }) // Sort by purchaseCount in descending order
        .limit(6) // Limit to 6 results
        .toArray();

      res.send(topCatergories);
    });
    // get discounted medicine from allmedicine COllection
    app.get("/discountedMedicine", async (req, res) => {
      const discountedMedicines = await medicinesCollection
        .find({ discountPercentage: { $gt: 0 } })
        .sort({ discountPercentage: -1 })

        .toArray();
      res.send(discountedMedicines);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("HealthBox is running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
