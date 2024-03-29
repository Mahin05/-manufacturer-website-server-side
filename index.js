const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId, ObjectID } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


// middleware
app.use(cors());
app.use(express.json());

//const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kx9ii.mongodb.net/?retryWrites=true&w=majority`;
const uri = "mongodb+srv://admin:L8UDTcBJt4wLkNXD@cluster0.kx9ii.mongodb.net/?retryWrites=true&w=majority";
 
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("products").collection('tools');
    const reviewCollection = client.db("products").collection('reviews');
    const userCollection = client.db("products").collection('users');
    const userInfoCollection = client.db("products").collection('usersInfo');
    const orderCollection = client.db("products").collection('orders');
    const paymentCollection = client.db("products").collection('payments');

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden' });
      }
    }

    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const toolName = req.body;
      const pricePerunit = toolName.pricePerunit;
      const amount = pricePerunit * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret })
    });

    app.get('/tools', async (req, res) => {
      const query = {};
      const cursor = toolsCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });

    app.post('/tools', async (req, res) => {
      const newTools = req.body;
      const result = await toolsCollection.insertOne(newTools);
      res.send(result);
    })

    // individual Order
    app.get('/booking', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const bookings = await orderCollection.find(query).toArray();
      res.send(bookings)
    })
    // app.get('/edituser',async(req,res)=>{
    //   const email= req.query.email;
    //   const query = {email:email};
    //   const bookings = await userInfoCollection.find(query).toArray();
    //   res.send(bookings)
    // })

    // app.put('/edituser',async(req,res)=>{
    //   const email= req.query.email;
    //   updatedUser = req.body;
    //   const query = {email:email};
    //   const options = {upsert:true}
    //   const updatedDoc = {
    //     $set:updatedUser
    //   }
    //   const bookings = await userInfoCollection.updateOne(query,updatedDoc,options)
    //   res.send(bookings)
    // })


    app.get('/order/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.send(order);
    })

    // get edit user
    app.get('/booking', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const bookings = await userInfoCollection.find(query).toArray();
      res.send(bookings);
    })

    //  update fields api
    app.put('/update', async (req, res) => {
      const email = req.params.email;
      const updatedInfo = req.body;
      const filter = { email: email };
      const options = { upsert: true }
      const updatedDoc = {
        $set: {
          quantity: updatedInfo.quantity
        }
      };
      const result = await userInfoCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    })

    // delete
    app.delete('/inventory/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    })
    app.delete('/tool/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await toolsCollection.deleteOne(query);
      res.send(result);
    })

    app.delete('/cancel/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    })


    app.put('/shipped/:id', async (req, res) => {
      const id = req.params.id;
      const shipped = req.body;
      const query = { _id: ObjectId(id) };
      const options = { upsert: true }
      const updatedDoc = {
        $set: {
          shipped: shipped
        }
      };
      const result = await userInfoCollection.updateOne(query, updatedDoc, options);
      res.send(result);
    })

    app.get('/manageInventory', async (req, res) => {
      const query = {};
      const cursor = orderCollection.find(query);
      const inventories = await cursor.toArray();
      res.send(inventories);
    });


    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin })
    })

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      var token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ result, token });
    })


    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;

      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.post('/order', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    })

    // app.put('/edituser',async(req,res)=>{
    //   const email= req.query.email;
    //   updatedUser = req.body;
    //   const query = {email:email};
    //   const options = {upsert:true}
    //   const updatedDoc = {
    //     $set:updatedUser
    //   }
    //   const bookings = await userInfoCollection.updateOne(query,updatedDoc,options)
    //   res.send(bookings)
    // })

    app.post('/userInfo/:email', async (req, res) => {
      const email = req.query.email;
      const info = req.body;
      const query = { email: email };
      const options = { upsert: true }
      const updatedDoc = {
        $set: info
      }
      const bookings = await userInfoCollection.updateOne(query, updatedDoc, options)
      res.send(bookings);
    })


    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    })

    app.post('/userInfo', async (req, res) => {
      const info = req.body;
      const result = await userInfoCollection.insertOne(info);
      res.send(result);
    })

    app.get('/purchase/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolsCollection.findOne(query);
      res.send(tool);
    });

    app.post('/review', async (req, res) => {
      const reviews = req.body;
      const result = await reviewCollection.insertOne(reviews);
      res.send(result);
    })
    app.get('/reviews', async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    })
    app.get('/allorders', async (req, res) => {
      const query = {};
      const cursor = orderCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    app.patch('/booking/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }
      }

      const result = await paymentCollection.insertOne(payment);
      const updatedBooking = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedBooking);
    })

  }
  finally {
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Server is running properly!')
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
