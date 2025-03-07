const express = require('express')
const cors = require("cors");
const app = express()
require('dotenv').config()

app.use(cors());
app.use(express.json());


const port = 5000


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // COLLECTIONS 
    const userCollection = client.db("SpendSmart").collection("users");
    const transactionCollections = client.db("SpendSmart").collection("transactions");
    const budgetCollections = client.db("SpendSmart").collection("budgets");
    const piggyBankCollections = client.db("SpendSmart").collection("piggyBank");
    const recurringBillCollections = client.db("SpendSmart").collection("recurringBills");

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

    // API TO GET TRANSACTIONS WITHOUT FILTERS 
    app.get("/getTransactions", async (req, res) => {
      let email = req.query.email;
      if (!email) {
        return res.status(400).send({ error: "Email is required" });
      }
      let query = { userEmail: email };
      const result = await transactionCollections.find(query).toArray();
      res.send(result);
    });

    // API TO ADD BUDGET 
    app.post("/addBudget", async (req, res) => {
      const { category, maxSpendAmount, colorTheme, userEmail } = req.body;
      const existingBudget = await budgetCollections.findOne({ category, userEmail });
      if (existingBudget) {
        return res.send({ exists: true });
      }
      const result = await budgetCollections.insertOne({ category, maxSpendAmount, colorTheme, userEmail });
      res.send({ insertedId: result.insertedId });
    });

    // API TO DELETE BUDGET 
    app.delete("/budgetDelete/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await budgetCollections.deleteOne(query);
      res.send(result);
    });

    // API TO UPDATE BUDGET 
    app.patch('/budgetUpdate/:id', async (req, res) => {
      const { id } = req.params
      const { maxSpendAmount, colorTheme } = req.body

      const result = await budgetCollections.updateOne(
        { _id: new ObjectId(id) },
        { $set: { maxSpendAmount, colorTheme } }
      )

      res.json(result)
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

    // API TO ADD PIGGY BANK
    app.post("/addPiggyBank", async (req, res) => {
      let piggyBank = req.body;
      let result = await piggyBankCollections.insertOne(piggyBank);
      res.send(result);
    })

    // API TO GET PIGGYBANK DATA 
    app.get("/getPiggyBank", async (req, res) => {
      let email = req.query.email;
      if (!email) {
        return res.status(400).send({ error: "Email is required" });
      }
      let query = { userEmail: email };
      const result = await piggyBankCollections.find(query).toArray();
      res.send(result);
    });

    // API TO DELETE PIGGY BANK 
    app.delete("/piggyBankDelete/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await piggyBankCollections.deleteOne(query);
      res.send(result);
    });

    // API TO UPDATE PIGGY BANK 
    app.patch('/piggyBankUpdate/:id', async (req, res) => {
      const { id } = req.params
      const { piggyBankName, targetSpend, colorTheme } = req.body

      const result = await piggyBankCollections.updateOne(
        { _id: new ObjectId(id) },
        { $set: { piggyBankName, targetSpend, colorTheme } }
      )

      res.json(result)
    })

    // API TO ADD MONEY TO PIGGY BANK 
    app.patch('/addMoney/:id', async (req, res) => {
      const { id } = req.params;
      const { addedAmount } = req.body;

      const result = await piggyBankCollections.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { availableBalance: addedAmount } } // Increment availableBalance
      );

      res.json(result);
    });

    // API TO WITHDRAW MONEY FROM PIGGY BANK
    app.patch('/withdrawMoney/:id', async (req, res) => {
      const { id } = req.params
      const { withdrawnAmount } = req.body

      const result = await piggyBankCollections.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { availableBalance: -withdrawnAmount } } // Decrease balance
      )

      res.json(result)
    })

    // API TO ADD RECURRING BILL 
    app.post("/addRecurringBill", async (req, res) => {
      let recurringBill = req.body;
      let result = await recurringBillCollections.insertOne(recurringBill);
      res.send(result);
    })

    // AP TO GET ALL RECURRING BILLS 
    app.get("/allBills", async (req, res) => {
      let email = req.query.email;
      if (!email) {
        return res.status(400).send({ error: "Email is required" });
      }
      let query = { currentUserEmail: email };
      const result = await recurringBillCollections.find(query).toArray();
      res.send(result);
    });

    // API TO GET BILLS BASED ON FILTER 
    app.get("/allFilteredBills", async (req, res) => {
      const { email, searchTerm, selectedFilterValue } = req.query;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      let query = { currentUserEmail: email };

      if (searchTerm) {
        query.billNameText = { $regex: searchTerm, $options: "i" };
      }

      let sortQuery = {};
      if (selectedFilterValue === "latest") {
        sortQuery.billDueDay = -1;
      } else if (selectedFilterValue === "oldest") {
        sortQuery.billDueDay = 1;
      } else if (selectedFilterValue === "highest") {
        sortQuery.billingAmount = -1;
      } else if (selectedFilterValue === "lowest") {
        sortQuery.billingAmount = 1;
      }

      try {
        const filteredBills = await recurringBillCollections
          .aggregate([
            { $match: query },
            {
              $addFields: {
                billingAmount: { $toDouble: "$billingAmount" },
                billDueDay: { $toInt: "$billDueDay" }
              }
            },
            { $sort: sortQuery }
          ])
          .toArray();

        res.send(filteredBills);
      } catch (error) {
        console.error("Error fetching Bills:", error);
        res.status(500).json({ error: "Error fetching Bills" });
      }
    });

    // API TO CHANGE BILL STATUS 
    app.patch('/updateBillStatus/:id', async (req, res) => {
      const billId = req.params.id
      const { billStatus } = req.body

      try {
        const updatedBill = await recurringBillCollections.updateOne(
          { _id: new ObjectId(billId) },
          { $set: { billStatus } }
        )

        if (updatedBill.modifiedCount > 0) {
          res.status(200).json({ message: 'Bill status updated successfully' })
        } else {
          res.status(400).json({ message: 'No changes made' })
        }
      } catch (error) {
        res.status(500).json({ message: 'Error updating bill status', error })
      }
    })

    // API TO DELETE BILL 
    app.delete("/deleteBill/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await recurringBillCollections.deleteOne(query);
      res.send(result);
    });


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Spend Smart Server is running!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})