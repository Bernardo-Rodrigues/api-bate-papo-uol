import express, {json} from "express"
import cors from "cors"
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"
import dayjs from "dayjs"
import joi from "joi"
dotenv.config()

const app = express()
app.use(cors())
app.use(json())

const userSchema = joi.object({
    name: joi.string().required()
});

const messageSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.valid("message", "private_message").required()
});

const mongoClient = new MongoClient(process.env.MONGO_URI);

<<<<<<< HEAD
function sanitizeString(string){
    return trim(stripHtml(string).result)
}

// setInterval( async ()=> {
//     try {
//         const participantsCollection = await getCollection("participants")
//         const messagesCollection = await getCollection("messages")
//         const participants = await participantsCollection.find({}).toArray()
=======
setInterval( async ()=> {
    try {
        const participantsCollection = await getCollection("participants")
        const messagesCollection = await getCollection("messages")
        const participants = await participantsCollection.find({}).toArray()
>>>>>>> parent of 37bd313... feat: add data sanitization bonus
    
//         for(const participant of participants){
//             if(participant.lastStatus < Date.now() - 10000){
//                 await participantsCollection.deleteOne({_id: participant._id})
//                 await messagesCollection.insertOne({
//                     from: participant.name,
//                     to: "Todos",
//                     text: "sai da sala...", 
//                     type: "status", 
//                     time: dayjs().format('HH:mm:ss')
//                 })
//             }
//         }
//     } catch (error) {
//         res.status(500).send(error)
//     }
//     mongoClient.close()
// }, 15000)

async function getCollection(collectionName){
    try {
        await mongoClient.connect()
    
        const db = mongoClient.db("api-bate-papo-uol");
        const collection = db.collection(collectionName)
    
        return collection
    } catch (error) {
        res.status(500).send(error)
    }
}

app.post("/participants", async (req, res) => {
    const { name } = req.body
    const validation = userSchema.validate(req.body, { abortEarly: false })

    if (validation.error) {
        res.status(422).send(validation.error.message);
        return
    }

    try{
        const participantsCollection = await getCollection("participants")
        const participant = await participantsCollection.findOne({name})

        if(participant) res.status(409).send("User already connected")
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
        res.status(500).send(error)
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
        const participantsCollection = await getCollection("participants")
        const participant = await participantsCollection.findOne({name:from})
        if(!participant) res.status(422).send("The user is not participating in the chat, perhaps he has been disconnected")

        const validation = messageSchema.validate({from, to, text, type},{abortEarly:false})

        if (validation.error) {
            res.status(422).send(validation.error.message);
            return
        }

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
        res.status(500).send(error)
    }

    mongoClient.close()
})

app.get("/messages", async (req, res) => {
<<<<<<< HEAD
    const { limit } = req.query
    const user = sanitizeString(req.headers.user)
=======
    const limit = req.query.limit
    const user = req.headers.user
>>>>>>> parent of 37bd313... feat: add data sanitization bonus

    try {
        const messagesCollection = await getCollection("messages")
        const messages = await messagesCollection.find({}).toArray()
    
        const filteredMessages = messages.filter( message => message.type === "message" || message.type === "status" || message.from === user || message.to === user)
        
        if(!limit) res.send(filteredMessages)
        else{
            res.send(filteredMessages.slice(-limit))
        }
    } catch (error) {
        res.status(500).send(error)
    }

    mongoClient.close()
})

app.post("/status", async (req,res) => {
    const { user } = req.headers

    try {
        const participantsCollection = await getCollection("participants")
        const participant = await participantsCollection.findOne({name:user})
    
        if(!participant) res.sendStatus(404)
        else{
            await participantsCollection.updateOne({
                _id: participant._id
            },{
                $set: { lastStatus: Date.now()  }
            })
            res.sendStatus(200)
        }        
    } catch (error) {
        res.status(500).send(error)
    }

    mongoClient.close()
})

app.delete("/messages/:id", async (req, res) => {
    const user = sanitizeString(req.headers.user)
    const { id } = req.params

    try {
        const messagesCollection = await getCollection("messages")
        const message = await messagesCollection.findOne({ _id: new ObjectId(id)})
        
        if(!message) res.status(404).send("Message not found")
        else if(message.from !== user) res.status(401).send("This message is not yours")
        else{
            await messagesCollection.deleteOne({ _id: new ObjectId(id)})
            res.sendStatus(200)
        }
    } catch (error) {
        res.status(500).send(error)
    }
})

app.listen(4000, ()=>{
    console.log("Server listening on Port 4000")
})