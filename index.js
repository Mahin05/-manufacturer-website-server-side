const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

 
// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kx9ii.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolsCollection = client.db("products").collection('tools');
        const reviewCollection = client.db("products").collection('reviews');

        app.get('/tools', async (req, res) => {
            const query = {};
            const cursor = toolsCollection.find(query);
            const tools = await cursor.limit(6).toArray();
            res.send(tools);
        });

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
