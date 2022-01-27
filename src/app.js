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

app.post("/participantes", async (req, res) => {
    const name = req.body.name

    try{
        const participants = await getCollection("participants")
        const sameName = await participants.find({name}).toArray()

        if(sameName.length) res.sendStatus(409)
        else{
            participants.insertOne({name, lastStatus: Date.now()})
            console.log(dayjs().format('HH:mm:ss'))
    
            const messages = await getCollection("messages")
            await messages.insertOne({
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

app.get("/participantes", async (req, res) => {
    const participants = await getCollection("participants")
    const allParticipantes = await participants.find({}).toArray()
    
    res.send(allParticipantes)

    mongoClient.close()
})

app.listen(4000, ()=>{
    console.log("Server listening on Port 4000")
})