import fs from "fs";
import BigNumber from "bignumber.js";

const users = JSON.parse(fs.readFileSync("./initial_users.json"));
const dumpFile = `./spend_worker_dumps/dump_worker_${process.argv[2]}.json`;
const numUsers = users.length;
const baseUrl = process.env.TEST_SERVER == '1' ? "https://ec2-3-138-246-144.us-east-2.compute.amazonaws.com/api" : "http://localhost:8080/api";
const spendUrl = baseUrl + "/transfer/spend"
const deltas = [];
for (let i = 0; i < numUsers; i++) {
    deltas.push("0");
}

let error_count = 0;
for (let i = 0; i < 50; i++) {
    let err = false;
    const index = Math.floor(Math.random() * numUsers);
    const user = users[index];
    const rand = Math.random();
    /* super small spend amount just so every user has enough money */
    const amount = (rand * (Math.random() * (10 ** 6))).toFixed(2);
    const body = {
        email: user.email,
        password: "1234",
        amount: amount
    };
    await fetch(spendUrl, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(body)
    })
    .catch(msg => {
            err = true;
            error_count++;
        }
    );
    if (!err) {
        deltas[index] = (parseFloat(deltas[index]) - parseFloat(amount)).toFixed(2);
    }
    // .then(res => res.json())
    // .then(json => console.log(json));
    // console.log(response);
}

fs.writeFileSync(dumpFile, JSON.stringify(deltas));
console.log(`Worker ${process.argv[2]} Finished With ${error_count} failed fetches.`);