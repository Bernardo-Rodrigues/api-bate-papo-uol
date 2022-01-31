import express, {json} from "express"
import cors from "cors"
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"
import dayjs from "dayjs"
import { stripHtml } from "string-strip-html";
import trim from "trim"
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

function sanitizeString(string){
    return trim(stripHtml(string).result)
}

setInterval( async ()=> {
    try {
        const participantsCollection = await getCollection("participants")
        const messagesCollection = await getCollection("messages")
        const participants = await participantsCollection.find({}).toArray()
    
        for(const participant of participants){
            if(participant.lastStatus < Date.now() - 10000){
                await participantsCollection.deleteOne({_id: participant._id})
                await messagesCollection.insertOne({
                    from: participant.name,
                    to: "Todos",
                    text: "sai da sala...", 
                    type: "status", 
                    time: dayjs().format('HH:mm:ss')
                })
            }
        }
    } catch (error) {
        res.status(500).send(error)
    }
    mongoClient.close()
}, 15000)

async function getCollection(collectionName){
    try {
        await mongoClient.connect()
    
        const db = mongoClient.db("api-bate-papo-uol");
        const collection = db.collection(collectionName)
    
        return collection
    } catch (error) {
        res.status(500).send(error.message)
    }
}

app.post("/participants", async (req, res) => {
    const name = sanitizeString(req.body.name)
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
        res.status(500).send(error.message)
    }
    mongoClient.close()
})

app.get("/participants", async (req, res) => {
    try {
        const participantsCollection = await getCollection("participants")
        const participants = await participantsCollection.find({}).toArray()
        
        res.send(participants)
    } catch (error) {
        res.status(500).send(error.message)
    }

    mongoClient.close()
})

app.post("/messages", async (req, res) => {
    const from = sanitizeString(req.headers.user)
    const [to, text, type] = [
        sanitizeString(req.body.to),
        sanitizeString(req.body.text),
        sanitizeString(req.body.type)
    ]
    
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
        res.status(500).send(error.message)
    }

    mongoClient.close()
})

app.get("/messages", async (req, res) => {
    const { limit } = req.query
    const user = sanitizeString(req.headers.user)

    try {
        const messagesCollection = await getCollection("messages")
        const messages = await messagesCollection.find({ 
            $or: [ 
                {type: "message"}, 
                {type: "status"}, 
                {from: user}, 
                {to: user}
            ]
        }).toArray()
    
        if(!limit) res.send(messages)
        else{
            res.send(messages.slice(-limit))
        }
    } catch (error) {
        res.status(500).send(error.message)
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
            await messagesCollection.deleteOne({ _id: new ObjectId(id) })
            res.sendStatus(200)
        }
    } catch (error) {
        res.status(500).send(error.message)
    }
})

app.put("/messages/:id", async (req, res) => {
    const { id } = req.params
    const from = sanitizeString(req.headers.user)
    const [to, text, type] = [
        sanitizeString(req.body.to),
        sanitizeString(req.body.text),
        sanitizeString(req.body.type)
    ]
    
    try {
        const messagesCollection = await getCollection("messages")
        const message = await messagesCollection.findOne({ _id: new ObjectId(id) })

        if(!message) res.status(404).send("Message not found")
        else if(message.from !== from) res.status(401).send("This message is not yours")
        else{
            const validation = messageSchema.validate({from, to, text, type},{abortEarly:false})
    
            if (validation.error) {
                res.status(422).send(validation.error.message);
                return
            }
    
            await messagesCollection.updateOne({
                _id: new ObjectId(id)
            },{
                $set:{
                    from, 
                    to, 
                    text, 
                    type, 
                    time: dayjs().format('HH:mm:ss')
                }
            })
            res.sendStatus(201)
        }
    } catch (error) {
        res.status(500).send(error.message)
    }

    mongoClient.close()
})

app.post("/status", async (req,res) => {
    const user = sanitizeString(req.headers.user)

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
        res.status(500).send(error.message)
    }

    mongoClient.close()         
})

app.listen(5000, ()=>{
    console.log("Server listening on Port 5000")
})