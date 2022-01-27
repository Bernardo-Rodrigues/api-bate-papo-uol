import express, {json} from "express"
import cors from "cors"
import { MongoClient } from "mongodb"
import dotenv from "dotenv"
import dayjs from "dayjs"
dotenv.config()

const app = express()
app.use(cors())
app.use(json())


const mongoClient = new MongoClient(process.env.MONGO_URI);

async function getCollection(collectionName){
    await mongoClient.connect()

    const db = mongoClient.db("api-bate-papo-uol");
    const collection = db.collection(collectionName)

    return collection
}

app.post("/participants", async (req, res) => {
    const name = req.body.name

    try{
        const participantsCollection = await getCollection("participants")
        const paritipants = await participantsCollection.find({name}).toArray()

        if(paritipants.length) res.sendStatus(409)
        else{
            participantsCollection.insertOne({name, lastStatus: Date.now()})
    
            const messagesCollection = await getCollection("messages")
            await messagesCollection.insertOne({
                from: name, 
                to: 'Todos', 
                text: 'entra na sala...', 
                type: 'status', 
                time: dayjs().format('HH:mm:ss')
            })
            res.sendStatus(201)
        }
    } catch (error) {
        console.error( error)
    }

    mongoClient.close()
})

app.get("/participants", async (req, res) => {
    const participantsCollection = await getCollection("participants")
    const participants = await participantsCollection.find({}).toArray()
    
    res.send(participants)

    mongoClient.close()
})

app.post("/messages", async (req, res) => {
    const from = req.headers.user
    const [to, text, type] = [req.body.to, req.body.text, req.body.type]

    try {
        const messagesCollection = await getCollection("messages")

        await messagesCollection.insertOne({
            from, 
            to, 
            text, 
            type, 
            time: dayjs().format('HH:mm:ss')
        })
        res.sendStatus(201)
    } catch (error) {
        console.error(error)
    }

    mongoClient.close()
})

app.get("/messages", async (req, res) => {
    const limit = req.query.limit
    const user = req.headers.user

    const messagesCollection = await getCollection("messages")
    const messages = await messagesCollection.find({}).toArray()

    const filteredMessages = messages.filter( message => message.type === "message" || message.type === "status" || message.from === user || message.to === user)
    
    if(!limit) res.send(filteredMessages)
    else{
        res.send(filteredMessages.slice(-limit))
    }
})

app.listen(4000, ()=>{
    console.log("Server listening on Port 4000")
})