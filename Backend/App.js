import express from "express"
import cors from 'cors'
const app = express()
export default app;
import directoryRouter from './API/directory.js'
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use("/directory", directoryRouter)

app.use((err, req, res, next)=> {
    switch (err.code) {
        case "22P02":
            return res.status(400).send(err.message);
        case "23505":
        case "23503":
            return res.status(400).send(err.detail);
        default:
            next(err);
    }
    app.use((err, req, res, next) => {
        console.error(err);
        res.status(500).send("Something went wrong.")
    })
})