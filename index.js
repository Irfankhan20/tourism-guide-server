const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());

//=====================================================================
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w7smd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // packages related apis======================================
    const packageCollection = client.db("uniqueTravel").collection("packages");

    //get 3 random packages
    app.get("/threePackages", async (req, res) => {
      const result = await packageCollection
        .aggregate([{ $sample: { size: 3 } }])
        .toArray();
      res.send(result);
    });

    //get package data by id
    app.get("/package/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await packageCollection.findOne(query);
      res.send(result);
    });

    //get all packages
    app.get("/packages", async (req, res) => {
      const result = await packageCollection.find().toArray();
      res.send(result);
    });

    // bookings related apis======================================
    const bookingsCollection = client.db("uniqueTravel").collection("bookings");

    //post booking
    app.post("/booking", async (req, res) => {
      const data = req.body;
      const result = await bookingsCollection.insertOne(data);
      res.send(result);
    });

    //bookings get by email
    app.get("/bookings/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "user.email": email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    //get all bookings
    app.get("/bookings", async (req, res) => {
      const result = await bookingsCollection.find().toArray();
      res.send(result);
    });

    //delete bookings
    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    //applications related apis=================================
    const applicationCollection = client
      .db("uniqueTravel")
      .collection("applications");

    //post application
    app.post("/application", async (req, res) => {
      const applicationData = req.body;
      const result = await applicationCollection.insertOne(applicationData);
      res.send(result);
    });

    // stories related apis======================================
    const storiesCollection = client
      .db("uniqueTravel")
      .collection("touristStories");

    //get 4 random stories
    app.get("/stories", async (req, res) => {
      const result = await storiesCollection
        .aggregate([{ $sample: { size: 4 } }])
        .toArray();
      res.send(result);
    });

    //get all storiess
    app.get("/allStories", async (req, res) => {
      const result = await storiesCollection.find().toArray();
      res.send(result);
    });

    //get stories by email
    app.get("/stories/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await storiesCollection.find(query).toArray();
      res.send(result);
    });

    //get story by id
    app.get("/story/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await storiesCollection.findOne(query);
      res.send(result);
    });

    //update story
    app.put("/update-story/:id", async (req, res) => {
      const id = req.params.id;
      const { newPhotos, removedPhotos, title, excerpt } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Story ID is required." });
      }

      const query = { _id: new ObjectId(id) };
      let updateDoc = { title, excerpt }; // Always update title and excerpt

      try {
        let updateResult = false;

        // Step 1: Update title and excerpt
        const titleExcerptResult = await storiesCollection.updateOne(query, {
          $set: updateDoc,
        });
        updateResult = titleExcerptResult.modifiedCount > 0;

        // Step 2: Remove the photos that need to be deleted
        if (removedPhotos && removedPhotos.length > 0) {
          const removedPhotosResult = await storiesCollection.updateOne(query, {
            $pull: { photo: { $in: removedPhotos } },
          });
          updateResult = updateResult || removedPhotosResult.modifiedCount > 0;
        }

        // Step 3: Add new photos
        if (newPhotos && newPhotos.length > 0) {
          const newPhotosResult = await storiesCollection.updateOne(query, {
            $push: { photo: { $each: newPhotos } },
          });
          updateResult = updateResult || newPhotosResult.modifiedCount > 0;
        }

        // Check if any changes were made
        if (updateResult) {
          res.status(200).json({ message: "Story updated successfully." });
        } else {
          res.status(400).json({ error: "No changes were made to the story." });
        }
      } catch (error) {
        console.error("Error updating story:", error);
        res.status(500).json({ error: "Failed to update story" });
      }
    });

    //post story
    app.post("/addStory", async (req, res) => {
      const data = req.body;
      const result = await storiesCollection.insertOne(data);
      res.send(result);
    });

    //delete story
    app.delete("/story/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await storiesCollection.deleteOne(query);
      res.send(result);
    });

    // guides related apis======================================
    const guideCollection = client.db("uniqueTravel").collection("tourGuides");

    //get 6 random guides
    app.get("/guides", async (req, res) => {
      const result = await guideCollection
        .aggregate([{ $sample: { size: 6 } }])
        .toArray();
      res.send(result);
    });

    //get all allGuides
    app.get("/allGuides", async (req, res) => {
      const result = await guideCollection.find().toArray();
      res.send(result);
    });

    //user related apis============================================
    const userCollection = client.db("uniqueTravel").collection("users");

    //user admin check
    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.userType === "admin";
      }
      res.send({ admin });
    });

    //user tourGuide check
    app.get("/user/tourGuide/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let tourGuide = false;
      if (user) {
        tourGuide = user?.userType === "tourGuide";
      }
      res.send({ tourGuide });
    });

    //all users
    app.get("/allUsers", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //user get by email
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    //update an user
    app.patch("/update-profile/:id", async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: data.name,
          photoURL: data.photoURL,
        },
      };
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    //user post
    app.post("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({
          message: "user already exists",
          insertedId: null,
        });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);
//=======================================================================

app.get("/", (req, res) => {
  res.send("tourism project running ");
});

app.listen(port, () => {
  console.log(` tourism project is running ${port}`);
});
