const express = require('express')
const cors = require("cors");
const app = express()
require('dotenv').config()

app.use(cors());
app.use(express.json());


const port = 5000


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `${process.env.MONGO_URI}`;

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // COLLECTIONS 
    const userCollection = client.db("SpendSmart").collection("users");
    const transactionCollections = client.db("SpendSmart").collection("transactions");
    const budgetCollections = client.db("SpendSmart").collection("budgets");

    // POST DATA OF USER TO MONGO DATABASE WHEN REGISTER 
    app.post("/userRegister", async (req, res) => {
      let user = req.body;
      let result = await userCollection.insertOne(user);
      res.send(result);
    })

    // POST USER DATA WHEN LOGIN WITH GOOGLE
    app.post("/userGoogleRegister", async (req, res) => {
      const userDetails = req.body;
      let checkEmail = userDetails.email;
      const existingUser = await userCollection.findOne({ email: checkEmail });

      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      let result = await userCollection.insertOne(userDetails);
      res.send(result);
    });

    // API TO GET CURRENT USER DATA 
    app.get("/userData/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email,
      };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // API TO ADD TRANSACTIONS 
    app.post("/addTransaction", async (req, res) => {
      let transactions = req.body;
      let result = await transactionCollections.insertOne(transactions);
      res.send(result);
    })

    // API TO GET TRANSACTIONS 
    app.get("/transactions", async (req, res) => {
      const { email, searchTerm, selectedFilterValue, selectedCategoryValue } = req.query;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      let query = { userEmail: email };

      if (searchTerm) {
        query.transactionName = { $regex: searchTerm, $options: "i" };
      }

      if (selectedCategoryValue && selectedCategoryValue !== "general") {
        query.category = selectedCategoryValue;
      }

      let sortQuery = {};
      if (selectedFilterValue === "latest") {
        sortQuery.transactionDate = -1;
      } else if (selectedFilterValue === "oldest") {
        sortQuery.transactionDate = 1;
      } else if (selectedFilterValue === "highest") {
        sortQuery.amount = -1;
      } else if (selectedFilterValue === "lowest") {
        sortQuery.amount = 1;
      }

      try {
        const transactions = await transactionCollections.find(query).sort(sortQuery).toArray();
        res.send(transactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ error: "Error fetching transactions" });
      }
    });

    // API TO ADD BUDGET 
    app.post("/addBudget", async (req, res) => {
      let budgetOptions = req.body;
      let result = await budgetCollections.insertOne(budgetOptions);
      res.send(result);
    })

    // API TO GET BUDGET DATA 
    app.get("/budgets", async (req, res) => {
      let email = req.query.email;
      if (!email) {
        return res.status(400).send({ error: "Email is required" });
      }
      let query = { userEmail: email };
      const result = await budgetCollections.find(query).toArray();
      res.send(result);
    });




  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})