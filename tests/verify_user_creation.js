import fs from "fs";
import { getAllUsers } from "./test_utils.js";
import BigNumber from "bignumber.js";
import bcrypt from "bcrypt";

/* insecure.. only for testing purposes
   remove when we have a legitimate SSL certificate */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log("Starting verification of user creation");
const numWorkers = process.argv[2];

const users = [];

for (let i = 1; i <= numWorkers; i++) {
    users.push(...(JSON.parse(fs.readFileSync(`./user_creation_worker_dumps/dump_worker_${i}.json`))));
}

const dumpfile = `./user_create_verification/all_users.json`;

fs.writeFileSync(dumpfile, JSON.stringify(users, null, 2));

const baseUrl = process.env.TEST_SERVER == '1' ? "https://ec2-3-138-246-144.us-east-2.compute.amazonaws.com/api" : "http://localhost:8080/api";
const getUrl = baseUrl + "/testing/all-users";

const retrieved = await getAllUsers(getUrl);
const dbUsers = retrieved.map(user => {
    return {
        email: user.email,
        password: user.password,
        balance: new BigNumber(user.balance),
        moneyRequestHistory: user.moneyRequestHistory
    };
});


dbUsers.sort((user1, user2) => {
    if (user1.email < user2.email) {
        return -1;
    }
    if (user1.email > user2.email) {
        return 1;
    }
    return 0;
});

users.sort((user1, user2) => {
    if (user1.email < user2.email) {
        return -1;
    }
    if (user1.email > user2.email) {
        return 1;
    }
    return 0;
});

if (dbUsers.length != users.length) {
    throw new Error("Unexpected database users length not equal to users length.");
}

let pass = true;

for (let i = 0; i < users.length; i++) {
    if (users[i].email != dbUsers[i].email) {
        pass = false;
        console.error( `Email mismatch on index ${i}: \n
        Expected User: ${users[i].email} != Actual User: ${dbUsers[i].email}`);
    }
    else if (!bcrypt.compareSync(users[i].password, dbUsers[i].password)) {
        pass = false;
        console.error(`Password mismatch on index ${i}: \n`);
    }
    console.log(`User ${i} in database has expected email ${users[i].email} and password ${users[i].password}.`);
}

if (pass) {
    console.log(`\x1b[32m', 'Concurrent user creation test passed on ${numWorkers} processes and ${users.length} created users!` ,'\x1b[0m');
}
else if (!pass) {
    console.log("\x1b[41m", "Concurrent User Creation Test Failed...", '\x1b[0m');
}

