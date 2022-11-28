import express from "express";
import helmet from "helmet";
import paypal from "paypal-rest-sdk";
import userInfoRouter from "./routes/user-info.js";
import accountInfoRouter from "./routes/account-info.js";
import transferRouter from "./routes/transfer.js";
import { RESPONSE, SECRET } from "./utils.js";
import { connectToMongoDB } from "./mongodb.js";
import md5 from "blueimp-md5";

/*
api/
├─ user-info/
│  ├─ password
├─ transfer/
├─ account-info/
│  ├─ balance
*/
console.log("Starting server");
// read environment variable to get port, if doesn't exist, use 8080
const PORT = process.env.PORT || 8080;
const username = process.env.DB_USERNAME || "nietian1";
const password = process.env.DB_PASSWORD || "Aibank1234";


const error = {
    val: ""
};


await connectToMongoDB(username, password, error);
if (error.val != "") {
    throw new Error("database connection " + error.val);
}

const app = express();

// http body should be in json format
app.use(express.json());
// security checks
app.use(helmet());

app.get(
    '/api',
    (req, res, next) => {
        res.status(RESPONSE.OK).send("Welcome to the AI Bank Of Forever APIs!");
        next();
    }
);

app.use('/api/user-info', userInfoRouter);
app.use('/api/transfer', transferRouter);
app.use('/api/account-info', accountInfoRouter);

app.listen(
    PORT,
    () => console.log(`Listening on port ${PORT}!!!!!`)
);
