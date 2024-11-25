const express = require("express");
const cors = require("cors");
const ImageKit = require("imagekit");
const fs = require("fs");
var jwt = require("jsonwebtoken");
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { Console } = require("console");
const app = express();
// This is your test secret API key.
const stripe = require("stripe")(process.env.STRIPE_SK);
// console.log("stripe secret", process.env.STRIPE_SK);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
// console.log(process.env.DB_USER);

// custom middleware
// custom midlw=eware verify token
const verifytoken = (req, res, next) => {
  console.log("inside verifytoken middleware", req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorised access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  // console.log("get token", token);
  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorised access" });
    }
    req.decoded = decoded;
    // console.log("from verifytoken decoded", decoded);
    next();
  });
};

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
    const advertisementsCollection = client
      .db("HealthBox")
      .collection("advertisements");

    //  middleware
    // verify admin after checking verfytoken
    const verifyadmin = async (req, res, next) => {
      const email = req.decoded.email;
      console.log("verify admin ", email);
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      console.log("inside verifyadmin", isAdmin);
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // verify seller after checking verfytoken
    const verifySellerAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      // console.log("verify moderator ", email);
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isSellerAdmin = user?.role === "seller" || user?.role === "admin";
      // console.log("inside verifyModeratorAdmin", isSellerAdmin);
      if (!isSellerAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // jwt related api

    app.post("/jwt", async (req, res) => {
      const userinfo = req?.body;
      // console.log("inside jwt", userinfo);
      const token = await jwt.sign(userinfo, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "4h",
      });
      console.log(token);

      res.send({ token });
    });

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
      const {
        name,
        companyName,
        price,
        quantity,
        userUid,
        image,
        stock,
        medicineId,
        sellerEmail,
      } = req.body;

      if (
        !name ||
        !companyName ||
        !price ||
        !userUid ||
        !image ||
        !stock ||
        !sellerEmail
      ) {
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
        medicineId,
        name,
        companyName,
        price,
        quantity: quantity || 1, // Default quantity is 1
        userUid,
        image,
        stock,
        sellerEmail,
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
      const payment = req?.body;
      console.log("saving payments details", payment);
      const { userId: userUid } = payment;

      // Step 1: Fetch all cart items for the user
      const cartItems = await cartsCollection.find({ userUid }).toArray();

      if (!cartItems.length) {
        return res
          .status(400)
          .send({ message: "No items in the cart to purchase." });
      }
      // Step 2: Create a payment document with cart items
      const paymentDocument = {
        ...payment, // Include payment details (e.g., amount, transaction ID, date)
        status: "pending",
        purchasedItems: cartItems, // Attach cart items to the payment record
      };
      // Step 3: Reduce stock for each purchased item
      for (const item of cartItems) {
        const { medicineId, quantity } = item; // Assuming medicineId and quantity are fields in cartItems

        // Reduce stock in allmedicine collection
        const updateResult = await medicinesCollection.updateOne(
          { _id: new ObjectId(medicineId) },
          { $inc: { stock: -quantity } } // Decrement stock by purchased quantity
        );

        if (!updateResult.modifiedCount) {
          return res.status(400).send({
            message: `Stock update failed for item ID: ${medicineId}`,
          });
        }
      }
      // step-4 delete all items in cart
      await cartsCollection.deleteMany({ userUid });
      const paymentResult = await paymentsCollection.insertOne(paymentDocument);

      res.send(paymentResult);
    });
    // get data for invoice
    app.get("/payment/:transactionId", async (req, res) => {
      const { transactionId } = req?.params;
      // console.log(transactionId);
      try {
        // Find payment by transactionId
        const paymentDetail = await paymentsCollection.findOne({
          transactionId,
        });

        if (!paymentDetail) {
          return res.status(404).send({ message: "Payment not found." });
        }

        res.send(paymentDetail);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch payment detail." });
      }
    });

    // admin related apis

    app.get("/admin/overview", verifytoken, verifyadmin, async (req, res) => {
      try {
        // Fetch all payments with 'pending' status
        const result = await paymentsCollection
          .aggregate([
            {
              $group: {
                _id: "$status", // Group by status (paid or pending)
                totalCount: { $sum: 1 }, // Count the number of documents
                totalAmount: { $sum: "$amount" }, // Sum the amount field for each status
              },
            },
            {
              $project: {
                _id: 0, // Exclude the _id field in the output
                status: "$_id", // Include the grouped status field
                totalAmount: 1, // Retain the totalAmount field
                totalCount: 1, // Include the totalCount
              },
            },
          ])
          .toArray();

        res.send(result);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ message: "Failed to fetch admin overview data." });
      }
    });

    // manage user role
    // make admin/moderator role verify admin middlware add korba etate
    app.put("/users/admin/:id", verifytoken, verifyadmin, async (req, res) => {
      const id = req.params.id;
      const { userRole } = req?.body;
      const filter = { uid: id };
      const options = {
        upsert: true,
      };
      const updatedDoc = {
        $set: {
          role: userRole,
        },
      };

      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    app.delete("/users/:id", verifytoken, async (req, res) => {
      const id = req.params?.id;
      // console.log(filterdata);

      let query = {
        _id: new ObjectId(id),
      };

      // console.log(query);
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/users", verifytoken, async (req, res) => {
      const filterdata = req.query?.role;
      console.log(filterdata);

      let query;
      if (filterdata) {
        query = {
          role: filterdata,
        };
      }
      console.log(query);
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // manage categories for admin
    // Fetch all categories
    app.get("/categories", verifytoken, verifyadmin, async (req, res) => {
      try {
        const categories = await categoriesCollection.find().toArray();
        res.send(categories);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error fetching categories." });
      }
    });

    // Add a new category
    app.post("/categories", async (req, res) => {
      const { categoryName, categoryImg } = req.body;

      if (!categoryName || !categoryImg) {
        return res.status(400).send({ message: "All fields are required." });
      }

      try {
        const result = await categoriesCollection.insertOne({
          categoryName,
          categoryImg,
        });
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error adding category." });
      }
    });

    // Update a category
    app.put("/categories/:id", verifytoken, async (req, res) => {
      const { id } = req.params;
      console.log("update modal category", id);
      const { categoryName, categoryImg } = req.body;

      try {
        const result = await categoriesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { categoryName, categoryImg } }
        );

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error updating category." });
      }
    });

    // Delete a category
    app.delete("/categories/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await categoriesCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error deleting category." });
      }
    });

    // sales report
    app.get("/sales", verifytoken, verifyadmin, async (req, res) => {
      const { startDate, endDate } = req?.query;
      console.log(startDate, endDate);

      try {
        // Parse dates

        let query = {};
        if (startDate && endDate) {
          query = {
            date: {
              $gte: new Date(startDate), // Start date
              $lte: new Date(endDate), // End date
            },
          };
        } else {
          query = {};
        }
        const sales = await paymentsCollection.find(query).toArray();
        console.log(sales);
        res.send(sales);
      } catch (error) {
        console.error("Error fetching sales:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // get manage payments
    app.get("/admin/payments", verifytoken, verifyadmin, async (req, res) => {
      // Fetch all payments
      const payments = await paymentsCollection.find().toArray();
      res.send(payments);
    });
    // update the payment status
    app.put("/payments/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid payment ID." });
        }

        const updateResult = await paymentsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "paid" } },
          { upsert: true } // Ensures the document is inserted if not found
        );

        res.send(updateResult);
      } catch (error) {
        console.error("Error updating payment status:", error);
        res.status(500).send({ error: "Failed to update payment status" });
      }
    });

    // advertisements for slider banner add or remove
    app.put("/advertisements/:id/toggleSlide", async (req, res) => {
      try {
        const { id } = req.params;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid advertisement ID." });
        }

        const advertisement = await advertisementsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!advertisement) {
          return res.status(404).send({ message: "Advertisement not found." });
        }

        const updatedStatus = !advertisement.isOnSlide; // Toggle the `isOnSlide` status

        const updateResult = await advertisementsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { isOnSlide: updatedStatus } }
        );

        res.send(updateResult);
      } catch (error) {
        console.error("Error toggling slide status:", error);
        res.status(500).send({ error: "Server error occurred." });
      }
    });
    app.get("/advertisements", verifytoken, verifyadmin, async (req, res) => {
      try {
        const advertisements = await advertisementsCollection.find().toArray();
        res.send(advertisements);
      } catch (error) {
        console.error("Error fetching advertisements:", error);
        res.status(500).send({ error: "Failed to fetch advertisements" });
      }
    });
    // for home page banner in client side no nedd to use axiosSecure
    app.get("/sliderAdvertisements", async (req, res) => {
      try {
        const sliderAds = await advertisementsCollection
          .find({ isOnSlide: true })
          .toArray();
        res.send(sliderAds);
      } catch (error) {
        console.error("Error fetching slider advertisements:", error);
        res
          .status(500)
          .send({ error: "Failed to fetch slider advertisements" });
      }
    });

    // slelr medicine mamage
    app.get(
      "/sales-revenue/:email",
      verifytoken,
      verifySellerAdmin,
      async (req, res) => {
        const email = req.params?.email;
        console.log("inside seller revenue", email);
        // Seller's email is passed as a query parameter.

        if (!email) {
          return res.status(400).send({ error: "Seller email is required." });
        }

        const result = await paymentsCollection
          .aggregate([
            {
              $unwind: "$purchasedItems", // Unwind the purchasedItems array
            },
            {
              $match: {
                "purchasedItems.sellerEmail": "syedhasanmohammad@gmaila.com", // Match seller's email in the purchasedItems field
              },
            },
            {
              $group: {
                _id: "$status", // Group by status (paid or pending)
                totalCount: { $sum: 1 }, // Count the number of documents
                amount: { $first: "$amount" }, // Include the amount field from the original document
              },
            },
            {
              $project: {
                _id: 0, // Exclude the _id field in the output
                status: "$_id", // Include the grouped status field
                amount: 1, // Retain the amount field
                totalCount: 1, // Include the totalCount
              },
            },
          ])
          .toArray();
        // Initialize totals

        // // Process the result to calculate paid and pending totals
        // result.forEach((item) => {
        //   if (item._id === "paid") {
        //     paidTotal = item.totalAmount;
        //   } else if (item._id === "pending") {
        //     pendingTotal = item.totalAmount;
        //   }
        // });

        res.send(result);
      }
    );
    // seller home page

    app.get("/seller-medicines", async (req, res) => {
      try {
        const { email } = req.query; // Seller's email is passed as a query parameter.

        if (!email) {
          return res.status(400).send({ error: "Seller email is required." });
        }

        const result = await paymentsCollection;
        aggregate([
          {
            $unwind: "$purchasedItems", // Unwind the purchasedItems array
          },
          {
            $match: {
              "purchasedItems.sellerEmail": email, // Match seller's email
            },
          },
        ]).toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching seller medicines:", error);
        res.status(500).send({ error: "Failed to fetch seller medicines." });
      }
    });

    // check if user is admin

    // check admin
    app.get(
      "/users/admin/:email",
      verifytoken,

      async (req, res) => {
        const email = req.params.email;
        // console.log("inside useAdmin route", req.decoded.email);
        // console.log("inside useAdmin params", email);

        if (email !== req.decoded.email) {
          return res.status(401).send({
            message: "Unauthorize access",
          });
        }
        const query = {
          email: email,
        };
        console.log(query);
        const user = await usersCollection.findOne(query);
        console.log("inside useAdmin route", user);
        let admin = false;
        if (user) {
          admin = user?.role === "admin";
        }
        res.send({ admin });
      }
    );

    // check seller
    app.get(
      "/users/seller/:email",
      verifytoken,

      async (req, res) => {
        const email = req.params.email;
        // console.log("inside seller route", req.decoded.email);
        // console.log("inside seller params", email);

        if (email !== req.decoded.email) {
          return res.status(401).send({
            message: "Unauthorize access",
          });
        }
        const query = {
          email: email,
        };
        // console.log(query);
        const user = await usersCollection.findOne(query);
        // console.log("inside check moderator route", user);
        let seller = false;
        if (user) {
          seller = user?.role === "seller";
        }
        console.log(seller);
        res.send({ seller });
      }
    );

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
