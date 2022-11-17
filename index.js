import express from "express";
import { initUserInfoEndpoint } from "./user-info.js";
import { initAccountInfoEndpoint } from "./account-info.js";
import { initTransferEndpoint } from "./transfer.js";
import { RESPONSE } from "./utils.js";

/*
api/
├─ user-info/
│  ├─ password
├─ transfer/
├─ account-info/
│  ├─ balance
*/

// read environment variable to get port, if doesn't exist, use 8080
const PORT = process.env.PORT || 8080;
const app = express();

// http body should be in json format
app.use(express.json());

app.get(
    '/api',
    (req, res) => {
        res.status(RESPONSE.OK).send("Welcome to the AI Bank Of Forever APIs!");
    }
);

initUserInfoEndpoint(app);
initAccountInfoEndpoint(app);
initTransferEndpoint(app);

app.listen(
    PORT,
    () => console.log(`Listening on port ${PORT}!!!!!`)
);
