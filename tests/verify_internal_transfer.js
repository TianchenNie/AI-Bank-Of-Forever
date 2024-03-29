import fs from "fs";
import { getAllUsers } from "./test_utils.js";
import BigNumber from "bignumber.js";

/* insecure.. only for testing purposes
   remove when we have a legitimate SSL certificate */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log("Starting verification of internal transfers");
const numWorkers = process.argv[2];
const deltas = [];
const users = JSON.parse(fs.readFileSync("./initial_users.json"));

for (let i = 0; i < users.length; i++) {
    users[i].balance = new BigNumber(users[i].balance);
}

for (let i = 1; i <= numWorkers; i++) {
    deltas.push(JSON.parse(fs.readFileSync(`./internal_transfer_worker_dumps/dump_worker_${i}.json`)));
}

const aggregateDelta = [];
for (let i = 0; i < users.length; i++) {
    aggregateDelta.push("0");
}

for (let i = 0; i < deltas.length; i++) {
    for (let j = 0; j < deltas[i].length; j++) {
        aggregateDelta[j] = (parseFloat(aggregateDelta[j]) + parseFloat(deltas[i][j])).toFixed(2);
    }
}

console.log("AGGREGATE DELTAS: ", aggregateDelta);

// console.log("AGGREGATE DELTAS: ", aggregateDelta);

for (let i = 0; i < aggregateDelta.length; i++) {
    users[i].balance = users[i].balance.plus(new BigNumber(aggregateDelta[i]));
}

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

let pass = true;

if (dbUsers.length != users.length) {
    console.error("Unexpected database users length not equal to users length.");
    pass = false;
}

for (let i = 0; i < users.length; i++) {
    if (!(users[i].balance.isEqualTo(dbUsers[i].balance))) {
        pass = false;
        console.error( `Mismatch on index ${i}: \n
        Expected User Balance: ${users[i].balance.toFixed(2)} != Actual User Balance: ${dbUsers[i].balance.toFixed(2)}`);
    }
    else {
        console.log(`Expected user balance of ${users[i].email} matches database balance of ${users[i].balance.toString()}`);
    }
}

if (pass) {
    console.log('\x1b[32m', 'Concurrent Internal Transfer Test Passed!' ,'\x1b[0m');
}
else if (!pass) {
    console.log("\x1b[41m", "Concurrent Internal Transfer Test Failed...", '\x1b[0m');
}

