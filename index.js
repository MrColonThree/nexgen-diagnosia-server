const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 7000;

// middleware
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());

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
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // to get specific user data
    app.get("/user", async (req, res) => {
      const userEmail = req.query.email;
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
    app.patch("/user-role/:id", verifyToken, async (req, res) => {
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
    app.patch("/user-status/:id", verifyToken, async (req, res) => {
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
    });
    // admin or not
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      // if (email !== req.decoded.email) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });
    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access " });
      }
      next();
    };
    // to post a banner
    app.post("/banners", async (req, res) => {
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
    app.patch("/banner/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      await bannerCollection.updateMany({}, { $set: { isActive: false } });
      const result = await bannerCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { isActive: true } }
      );
      res.send(result);
    });
    // to get footer data
    app.get("/footer", async (req, res) => {
      const result = await footerDataCollection.find().toArray();
      res.send(result);
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
