import express from "express";
import helmet from "helmet";
import userInfoRouter from "./routes/user-info.js";
import accountInfoRouter from "./routes/account-info.js";
import transferRouter from "./routes/transfer.js";
import { DB_USERNAME, DB_PASSWORD, PORT ,RESPONSE } from "./utils.js";
import { connectToMongoDB } from "./mongodb.js";

/*
api/
├─ user-info/
│  ├─ password
├─ transfer/
├─ account-info/
│  ├─ balance
*/
console.log("Starting server");


await connectToMongoDB(DB_USERNAME, DB_PASSWORD);

const app = express();

// http packet body should be in json format
app.use(express.json());

// security checks
app.use(helmet());

app.get(
    '/api',
    (req, res, next) => {
        res.status(RESPONSE.OK).send("Welcome to the AI Bank Of Forever APIs!");
        return next();
    }
);

app.use('/api/user-info', userInfoRouter);
app.use('/api/transfer', transferRouter);
app.use('/api/account-info', accountInfoRouter);

app.listen(
    PORT,
    () => console.log(`Listening on port ${PORT}.`)
);
