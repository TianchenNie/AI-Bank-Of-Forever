import fs from "fs";
import BigNumber from "bignumber.js";
import axios from "axios";

/* insecure.. only for testing purposes
   remove when we have a legitimate SSL certificate */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const users = JSON.parse(fs.readFileSync("./initial_users.json"));
const dumpFile = `./internal_transfer_worker_dumps/dump_worker_${process.argv[2]}.json`;
const numUsers = users.length;
const baseUrl = process.env.TEST_SERVER == '1' ? "https://ec2-3-138-246-144.us-east-2.compute.amazonaws.com/api" : "http://localhost:8080/api";
const transferUrl = baseUrl + "/transfer/internal"
const deltas = [];
for (let i = 0; i < numUsers; i++) {
    deltas.push("0");
}

let error_count = 0;
for (let i = 0; i < 20; i++) {
    let err = false;
    const index = Math.floor(Math.random() * numUsers);
    let index2 = Math.floor(Math.random() * numUsers);
    while (index2 == index) {
        index2 = Math.floor(Math.random() * numUsers);
    }

    const sender = users[index];
    const receiver = users[index2];
    const senderPassword = users[index].email.split("@")[0];
    /* super small spend amount just so every user has enough money */
    const amount = (Math.random() * (Math.random() * (10 ** 6))).toFixed(2);
    const body = {
        sender: sender.email,
        receiver: receiver.email,
        senderPassword: senderPassword,
        amount: amount
    };
    try {
        const response = await axios.post(transferUrl, body, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 20 * 128000,
                withCredentials: true
            }
        );
    }
    catch (msg) {
        console.error(msg);
        err = true;
        error_count++;
    }
    if (!err) {
        deltas[index] = (parseFloat(deltas[index]) - parseFloat(amount)).toFixed(2);
        deltas[index2] = (parseFloat(deltas[index2]) + parseFloat(amount)).toFixed(2);
    }
    // .then(res => res.json())
    // .then(json => console.log(json));
    // console.log(response);
}

fs.writeFileSync(dumpFile, JSON.stringify(deltas));
console.log(`Worker ${process.argv[2]} Finished With ${error_count} Failed Fetches.`);