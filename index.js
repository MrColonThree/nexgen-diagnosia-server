const express = require("express");
const cloudinary = require("cloudinary").v2;
const formData = require("express-form-data");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 7000;

// middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://nexgen-diagnosia.web.app"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(formData.parse());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.post("/upload", async (req, res) => {
  const { file } = req.files;
  const result = await cloudinary.uploader.upload(file.path, {
    resource_type: "raw",
    access_mode: "public",
  });
  res.json({ url: result.secure_url, success: true });
});
const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.PASS_DB}@cluster0.edvzxqj.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();

    const divisionCollection = client.db("nexgenDB").collection("divisions");
    const districtCollection = client.db("nexgenDB").collection("districts");
    const upazilaCollection = client.db("nexgenDB").collection("upazilas");
    const userCollection = client.db("nexgenDB").collection("users");
    const bannerCollection = client.db("nexgenDB").collection("banners");
    const footerDataCollection = client.db("nexgenDB").collection("footerData");
    const blogCollection = client.db("nexgenDB").collection("blogs");
    const aboutCollection = client.db("nexgenDB").collection("about");
    const testCollection = client.db("nexgenDB").collection("tests");
    const promotionCollection = client.db("nexgenDB").collection("promotions");
    const tipCollection = client.db("nexgenDB").collection("tips");
    const reportCollection = client.db("nexgenDB").collection("reports");
    const testimonialCollection = client
      .db("nexgenDB")
      .collection("testimonials");
    const appointmentCollection = client
      .db("nexgenDB")
      .collection("appointments");

    const verifyToken = (req, res, next) => {
      const token = req?.cookies?.token;
      if (!token) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.user = decoded;
        next();
      });
    };
    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.user?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access " });
      }
      next();
    };

    // to get division
    app.get("/divisions", async (req, res) => {
      const divisions = await divisionCollection.find().toArray();
      res.send(divisions);
    });
    // to get district
    app.get("/districts", async (req, res) => {
      const districts = await districtCollection.find().toArray();
      res.send(districts);
    });
    // to get upazila
    app.get("/upazilas", async (req, res) => {
      const upazilas = await upazilaCollection.find().toArray();
      res.send(upazilas);
    });

    // user related api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return;
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // to get all users
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // to get specific user data
    app.get("/user", async (req, res) => {
      const userEmail = req?.query?.email;
      const query = { email: userEmail };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    // tu update userData
    app.put("/users", verifyToken, async (req, res) => {
      const user = req.body;
      console.log(user);
      const filter = { email: user.email };
      const updatedUser = {
        $set: {
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
          bloodGroup: user.bloodGroup,
          division: user.division,
          district: user.district,
          upazila: user.upazila,
        },
      };
      const result = await userCollection.updateOne(filter, updatedUser);
      res.send(result);
    });
    // to update specific user's role
    app.patch("/user-role/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedUser);
      res.send(result);
    });
    // to change specific user's status
    app.patch(
      "/user-status/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const user = await userCollection.findOne(filter);
        let updatedStatus = user.status === "active" ? "blocked" : "active";
        const updatedUser = {
          $set: {
            status: updatedStatus,
          },
        };
        const result = await userCollection.updateOne(filter, updatedUser);
        res.send(result);
      }
    );
    // admin or not
    app.get(
      "/users/admin/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        if (email !== req.user?.email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === "admin";
        }
        res.send({ admin });
      }
    );
    // to add test
    app.post("/tests", verifyToken, verifyAdmin, async (req, res) => {
      const test = req.body;
      const result = await testCollection.insertOne(test);
      res.send(result);
    });
    // to get all test
    app.get("/tests", async (req, res) => {
      const date = req.query.date;
      let query = {};
      if (date) {
        query.date = { $gte: date };
      }
      const result = await testCollection.find(query).toArray();
      res.send(result);
    });
    // to update test
    app.put("/tests", verifyAdmin, verifyToken, async (req, res) => {
      const test = req.body;
      const filter = { _id: new ObjectId(test._id) };
      const updatedTest = {
        $set: {
          testName: test.testName,
          details: test.details,
          shortDetails: test.shortDetails,
          slots: test.slots,
          price: test.price,
          date: test.date,
          imageURL: test.imageURL,
          slotsAvailable: test.slotsAvailable,
          booked: test.booked,
        },
      };
      const result = await testCollection.updateOne(filter, updatedTest);
      res.send(result);
    });
    // to delete test
    app.delete("/test/:id", verifyAdmin, verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testCollection.deleteOne(query);
      res.send(result);
    });
    // to get featured tests
    app.get("/featured", async (req, res) => {
      const featured = { booked: -1 };
      const result = await testCollection
        .find()
        .sort(featured)
        .limit(6)
        .toArray();
      res.send(result);
    });
    // to get a specific test data
    app.get("/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testCollection.findOne(query);
      res.send(result);
    });
    // to post test as appointments
    app.post("/appointments", verifyToken, async (req, res) => {
      const paidTest = req.body;
      const filter = { testName: paidTest.testName };
      const updateTest = {
        $inc: {
          booked: 1,
          slotsAvailable: -1,
        },
      };
      const updateResult = await testCollection.updateOne(filter, updateTest);
      const result = await appointmentCollection.insertOne(paidTest);
      res.send(result);
    });
    // to get reservations or appointments
    app.get("/appointments", verifyToken, async (req, res) => {
      const email = req.query.email;
      const search = req.query.search;
      let query = {};
      if (email) {
        query.email = email;
      }
      if (search) {
        query.email = { $regex: search, $options: "i" };
      }
      const result = await appointmentCollection.find(query).toArray();
      res.send(result);
    });
    // to delete a specific appointments
    app.delete("/appointments/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await appointmentCollection.deleteOne(query);
      res.send(result);
    });
    // to post report
    app.post("/reports", verifyToken, verifyAdmin, async (req, res) => {
      const report = req.body;
      const id = req.body.id;
      const updateData = await appointmentCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "delivered" } }
      );
      const result = await reportCollection.insertOne(report);
      console.log(result);
      res.send(result);
    });
    // to post report
    app.get("/reports", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query.email = email;
      }
      const result = await reportCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });
    // to post a banner
    app.post("/banners", verifyToken, verifyAdmin, async (req, res) => {
      const banner = req.body;
      const result = await bannerCollection.insertOne(banner);
      res.send(result);
    });
    // banner data
    app.get("/banners", async (req, res) => {
      const result = await bannerCollection.find().toArray();
      res.send(result);
    });
    app.get("/active-banner", async (req, res) => {
      const result = await bannerCollection.findOne({ isActive: true });
      res.send(result);
    });
    app.patch("/banner/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      await bannerCollection.updateMany({}, { $set: { isActive: false } });
      const result = await bannerCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { isActive: true } }
      );
      res.send(result);
    });
    // to delete a banner
    app.delete("/banner/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bannerCollection.deleteOne(query);
      res.send(result);
    });
    // to get promotions data
    app.get("/promotions", async (req, res) => {
      const result = await promotionCollection.find().toArray();
      res.send(result);
    });
    // to get testimonials
    app.get("/testimonials", async (req, res) => {
      const result = await testimonialCollection.find().toArray();
      res.send(result);
    });
    // to get health and tips section data
    app.get("/tips", async (req, res) => {
      const result = await tipCollection.find().toArray();
      res.send(result);
    });
    // to get blog page data
    app.get("/blogs", async (req, res) => {
      const result = await blogCollection.find().toArray();
      res.send(result);
    });
    app.get("/about", async (req, res) => {
      const result = await aboutCollection.find().toArray();
      res.send(result);
    });
    // to get footer data
    app.get("/footer", async (req, res) => {
      const result = await footerDataCollection.find().toArray();
      res.send(result);
    });

    // payment intent
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(price);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "inr",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production" ? true : false,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ status: true });
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
  res.send("NexGen Diagnosia is running");
});

app.listen(port, () => {
  console.log("NexGen Diagnosia is running on port", port);
});
