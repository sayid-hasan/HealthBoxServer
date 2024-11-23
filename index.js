const express = require("express");
const cors = require("cors");
const ImageKit = require("imagekit");

require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
// This is your test secret API key.
const stripe = require("stripe")(process.env.STRIPE_SK);
// console.log("stripe secret", process.env.STRIPE_SK);
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
    const paymentsCollection = client.db("HealthBox").collection("payments");

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
      const { name, companyName, price, quantity, userUid, image, stock } =
        req.body;

      if (!name || !companyName || !price || !userUid || !image || !stock) {
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
        image,
        stock,
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
    // get users cart items
    app.get("/cart/:userUid", async (req, res) => {
      const userUid = req.params.userUid; // Get `userUid` from route params

      // Ensure `userUid` is provided
      if (!userUid) {
        return res.status(400).send({ error: "please login" });
      }

      // Filter cart items based on `userUid`
      const result = await cartsCollection.find({ userUid }).toArray();
      res.send(result);
    });
    //update cart items quantity
    app.patch("/cart/:id", async (req, res) => {
      const { id } = req.params;
      const { quantity } = req.body;

      try {
        const result = await cartsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { quantity: quantity } }
        );

        if (result.modifiedCount > 0) {
          res.status(200).send({ message: "Quantity updated successfully." });
        } else {
          res.status(400).send({ message: "Failed to update quantity." });
        }
      } catch (error) {
        console.error("Error updating quantity:", error);
        res.status(500).send({ message: "Server error." });
      }
    });
    // delete cart items
    app.delete("/cart/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await cartsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount > 0) {
          res
            .status(200)
            .send({ success: true, message: "Item deleted successfully" });
        } else {
          res.status(404).send({ success: false, message: "Item not found" });
        }
      } catch (error) {
        res
          .status(500)
          .send({ success: false, message: "Failed to delete item", error });
      }
    });
    // paymentIntent for stripe
    app.post("/create-payment-intent", async (req, res) => {
      const { amount } = req.body;
      console.log(amount);

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "aed",
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        automatic_payment_methods: { enabled: true },
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
        paymentIntent,
      });
    });
    // save payment history
    // save payment history
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      console.log("saving payments details", payment);
      const paymentResult = await paymentsCollection.insertOne(payment);

      res.send(paymentResult);
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
