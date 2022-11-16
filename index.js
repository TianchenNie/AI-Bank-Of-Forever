const OK = 200;
const BAD_REQUEST = 400;
const INVALID_AUTH = 401;
const NOT_FOUND = 404;
// read environment variable to get port, if doesn't exist, use 8080
const PORT = process.env.PORT || 8080;
const express = require("express");
app = express();

const users = {
    "a@gmail.com": {
        "password": "a",
        "balance": 30000.00
    },
    "b@gmail.com": {
        "password": "b",
        "balance": 40
    },
    "c@gmail.com": {
        "password": "c",
        "balance": 50
    }
};

app.use(express.json());

app.get(
    '/',
    (req, res) => {
        res.status(OK).send("Welcome to the AI Bank Of Forever!");
    }
);

app.get(
    '/poll-user/:email',
    (req, res) => {
        const email = req.params.email;
        if (email != undefined) {
            res.status(OK).send(`Trying to find info for user with email: ${email}`);
        }
        else if (email == undefined) {
            res.status(BAD_REQUEST).send("Please enter a valid email address.");
        }
    }
);

app.get(
    '/poll-user/:email/:password',
    (req, res) => {
        const email = req.params.email;
        const password = req.params.password;
        const user = users[email];
        if (!user) {
            res.status(INVALID_AUTH).send(`Couldn't find user with email ${email}`);
            return;
        }
        const correctPass = user.password;
        if (password != correctPass) {
            res.status(INVALID_AUTH).send(`Incorrect password.`);
            return;
        }
        res.status(OK).send(`User account balance: ${user.balance.toFixed(2)}`);
    }
);

app.listen(
    PORT,
    () => console.log(`Listening on port ${PORT}!!!!!`)
);
