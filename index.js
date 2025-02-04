require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const axios = require("axios");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(
  cors({
    origin: ["https://unique-travel-c3fd8.web.app", "http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());

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
    // await client.connect();

    //jwt related apis==================================================

    //create token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JSON_ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //middleware for token
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res
          .status(403)
          .send({ message: "forbidden access from line 45" });
      }
      const token = req.headers.authorization.split(" ")[1];
      console.log(token);
      jwt.verify(token, process.env.JSON_ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res
            .status(403)
            .send({ message: "forbidden access from line 52" });
        }
        req.decoded = decoded;
        next();
      });
    };

    //middleware for verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.userType === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //middleware for verify tourguide
    const verifyTourGuide = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isTourGuide = user?.userType === "tourGuide";
      if (!isTourGuide) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

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

    //post package
    app.post("/add-package", async (req, res) => {
      const data = req.body;
      const result = await packageCollection.insertOne(data);
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

    //bookings get by useremail
    app.get("/bookings/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { "user.email": email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    //bookings get by guide-email
    app.get(
      "/guides-asigned-tours/:email",
      verifyToken,
      verifyTourGuide,
      async (req, res) => {
        const email = req.params.email;
        const query = { "guide.email": email };
        const result = await bookingsCollection.find(query).toArray();
        res.send(result);
      }
    );

    //get booking by id
    app.get("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.findOne(query);
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

    //update bookings for reject by guide
    app.patch("/bookings-reject/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          status: "Rejected",
        },
      };

      const userUpdateResult = await bookingsCollection.updateOne(
        query,
        update
      );
      res.send(userUpdateResult);
    });
    //update bookings for accept by guide
    app.patch("/bookings-accept/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          status: "Accepted",
        },
      };

      const userUpdateResult = await bookingsCollection.updateOne(
        query,
        update
      );
      res.send(userUpdateResult);
    });

    //applications related apis=================================
    const applicationCollection = client
      .db("uniqueTravel")
      .collection("applications");

    //get all applications
    app.get("/applications", verifyToken, verifyAdmin, async (req, res) => {
      const result = await applicationCollection.find().toArray();
      res.send(result);
    });

    //post application
    app.post("/application", async (req, res) => {
      const applicationData = req.body;
      const query = { email: applicationData.email };
      const existingUser = await applicationCollection.findOne(query);
      if (existingUser) {
        return res.send({
          message: "user already exists",
          insertedId: null,
        });
      }
      const result = await applicationCollection.insertOne(applicationData);
      res.send(result);
    });

    //update application
    app.patch("/application-update/:id", async (req, res) => {
      const applicationId = req.params.id;
      const query = { _id: new ObjectId(applicationId) };
      const application = await applicationCollection.findOne(query);
      console.log(application);

      const applicationWithoutId = {
        name: application.name,
        photo: application.photo,
        specialty: application.specialty,
        contact: application.contact,
        email: application.email,
      };

      const userQuery = { _id: new ObjectId(application.userId) };
      const user = await userCollection.findOne(userQuery);
      console.log(user);

      if (!application || !user) {
        return res.status(404).send({ message: "Application not found" });
      }

      const userUpdate = {
        $set: {
          userType: "tourGuide",
        },
      };

      const userUpdateResult = await userCollection.updateOne(
        userQuery,
        userUpdate
      );

      const insertApplicationToGuide = await guideCollection.insertOne(
        applicationWithoutId
      );

      res.send({ userUpdateResult, insertApplicationToGuide });
    });

    //delete application
    app.delete("/application/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await applicationCollection.deleteOne();
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
    app.get("/stories/:email", verifyToken, async (req, res) => {
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
    app.get("/allUsers", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //user get for search and filter
    app.get("/users", async (req, res) => {
      try {
        const { search, role } = req.query;
        const query = {};

        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ];
        }

        if (role) {
          query.userType = role;
        }

        const users = await userCollection.find(query).toArray();

        res.send(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ error: "Failed to fetch users" });
      }
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

    //discount coupon apis==========================================
    const cuponCollection = client
      .db("uniqueTravel")
      .collection("discountCupon");

    //get all coupon
    app.get("/allCupons", verifyToken, async (req, res) => {
      const result = await cuponCollection.find().toArray();
      res.send(result);
    });

    //payment related apis==========================================
    const paymentCollection = client.db("uniqueTravel").collection("payment");

    //post payment
    app.post("/create-payment", verifyToken, async (req, res) => {
      const paymentData = req.body;
      console.log(paymentData);

      const randomCode = Array(4)
        .fill(0)
        .map(() => Math.random().toString(36).substring(2, 10))
        .join("")
        .substring(0, 16);
      console.log(randomCode);

      const initialData = {
        store_id: `${process.env.STORE_ID}`,
        store_passwd: `${process.env.STORE_PASS}`,
        total_amount: paymentData?.amountToPay,
        currency: "BDT",
        tran_id: `${randomCode}`,
        total_amount: `${paymentData?.totalAmount}`,
        success_url: "https://unique-travel-server.vercel.app/success-payment",
        fail_url: "https://unique-travel-server.vercel.app/fail",
        cancel_url: "https://unique-travel-server.vercel.app/cancle",
        cus_name: `${paymentData?.name}`,
        cus_email: `${paymentData?.email}`,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: `${paymentData?.city}`,
        cus_state: "Dhaka",
        cus_postcode: 1000,
        product_name: `${paymentData?.packageName}`,
        product_category: "tour",
        product_profile: "general",
        cus_country: `${paymentData?.address}`,
        cus_phone: `${paymentData?.phone}`,
        cus_fax: "01711111111",
        shipping_method: "No",
        multi_card_name: "mastercard,visacard,amexcard",
        value_a: "ref001_A",
        value_b: "ref002_B",
        value_c: "ref003_C",
        value_d: "ref004_D",
      };

      const response = await axios({
        method: "POST",
        url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
        data: initialData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      console.log(response);

      const paymentInformation = {
        bookId: paymentData?.bookId,
        tourDate: paymentData?.tourDate,
        email: paymentData?.email,
        name: paymentData?.name,
        phone: paymentData?.phone,
        address: paymentData?.address,
        city: paymentData?.city,
        payAmount: paymentData?.payAmount,
        packageName: paymentData?.packageName,
        totalAmount: paymentData?.totalAmount,
        status: "pending",
        trxId: randomCode,
      };

      const sendPaymentInfoToDb = await paymentCollection.insertOne(
        paymentInformation
      );

      if (sendPaymentInfoToDb) {
        res.send({
          paymentUrl: response.data.GatewayPageURL,
        });
      }
    });

    //success payment
    app.post("/success-payment", async (req, res) => {
      const successData = req.body;
      console.log("from success-payment", successData);

      if (successData.status !== "VALID") {
        throw new Error("UNauthorized payment, Invalid Payment Error");
      }

      const query = { trxId: successData.tran_id };
      const getPaymentInfo = await paymentCollection.findOne(query);
      console.log(getPaymentInfo);

      const bookId = { _id: new ObjectId(getPaymentInfo.bookId) };
      const getBookInfo = await bookingsCollection.findOne(bookId);
      console.log(getBookInfo);
      const bookingUpdateDoc = {
        $set: {
          status: "In Review",
        },
      };
      const updateBookingData = await bookingsCollection.updateOne(
        bookId,
        bookingUpdateDoc
      );

      const paymentUpdateDoc = {
        $set: {
          status: "success",
        },
      };
      const updatePaymentData = await paymentCollection.updateOne(
        query,
        paymentUpdateDoc
      );
      console.log("update payment data", updatePaymentData);
      console.log("update booking data", updateBookingData);

      res.redirect(
        "https://unique-travel-c3fd8.web.app/dashboard/paymentSuccess"
      );
    });

    //failed payment
    app.post("/fail", async (req, res) => {
      res.redirect("http://localhost:5173/dashboard/paymentFailed");
    });

    //cancle payment
    app.post("/cancle", async (req, res) => {
      res.redirect("http://localhost:5173/dashboard/paymentFailed");
    });

    //get all payments info
    app.get("/payments", verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });

    //admin profile make=============================================
    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      const totalPackages = await packageCollection.estimatedDocumentCount();
      const totalStories = await storiesCollection.estimatedDocumentCount();
      const result = await paymentCollection
        .aggregate([
          {
            $match: { status: "success" }, // Filter for successful payments
          },
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: "$totalAmount",
              },
            },
          },
        ])
        .toArray();
      const totalPayment = result.length > 0 ? result[0].totalRevenue : 0;

      const userTypeCounts = await userCollection
        .aggregate([
          {
            $group: {
              _id: "$userType",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      // Transform results into a key-value object
      const userTypeSummary = userTypeCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {});

      // Extract totalTourGuides and totalTourists
      const totalTourGuides = userTypeSummary["tourGuide"] || 0;
      const totalTourists = userTypeSummary["tourist"] || 0;

      res.send({
        totalTourGuides,
        totalTourists,
        totalPackages,
        totalStories,
        totalPayment,
      });
    });
    //===============================================================

    // await client.db("admin").command({ ping: 1 });
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
