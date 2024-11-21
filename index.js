const express = require("express");
const cors = require("cors");
const ImageKit = require("imagekit");

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

    const reviewsCollection = client.db("HealthBox").collection("reviews");
    const usersCollection = client.db("HealthBox").collection("users");
    const cartsCollection = client.db("HealthBox").collection("carts");

    // apis

    // home page
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

    // reviews
    app.get("/reviews", async (req, res) => {
      const reviews = await reviewsCollection
        .find()
        .sort({ starRating: -1 }) // Sort by starRating in descending order
        .limit(6) // Limit to top 6 reviews
        .toArray();

      res.send(reviews);
    });

    // shop page
    app.get("/allMedicines", async (req, res) => {
      const result = await medicinesCollection.find().toArray();
      res.send(result);
    });
    // Get medicine by ID
    app.get("/medicine/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }; // Ensure you import ObjectId from MongoDB
      const result = await medicinesCollection.findOne(query);
      res.send(result);
    });

    // get medicine by category
    app.get("/medicines/category/:category", async (req, res) => {
      const { category } = req.params;
      const result = await medicinesCollection
        .find({ category: category })
        .toArray();
      res.send(result);
    });

    // imagekit image Upload getsignature
    app.get("/get-signature", async (req, res) => {
      var imagekit = new ImageKit({
        publicKey: process.env.IMAGEKIT_PK,
        privateKey: process.env.IMAGEKIT_SK,
        urlEndpoint: "https://ik.imagekit.io/sayidImage34/",
      });
      const authenticationParameters =
        await imagekit.getAuthenticationParameters();
      console.log(authenticationParameters);
      res.send(authenticationParameters);
    });

    // post user data
    app.post("/users", async (req, res) => {
      const user = req?.body;
      // Check if the email already exists
      const existingUser = await usersCollection.findOne({ uid: user?.uid });

      if (existingUser) {
        return res.send({ message: "Email already exists" });
      }

      // console.log("inside all users", user);
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // post cart data
    app.post("/cart", async (req, res) => {
      const { name, companyName, price, quantity, userUid } = req.body;

      if (!name || !companyName || !price || !userUid) {
        return res.status(400).send({ error: "All fields are required." });
      }

      // Check if the product already exists in the user's cart
      const existingCartItem = await cartsCollection.findOne({ name, userUid });

      if (existingCartItem) {
        return res
          .status(409)
          .send({ message: "Product already exists in the cart." }); // 409 Conflict
      }

      const newCartItem = {
        name,
        companyName,
        price,
        quantity: quantity || 1, // Default quantity is 1
        userUid,
      };

      const result = await cartsCollection.insertOne(newCartItem);

      if (result.acknowledged) {
        res
          .status(201)
          .send({ message: "Product added to the cart successfully." });
      } else {
        res.status(500).send({ error: "Failed to add product to the cart." });
      }
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
