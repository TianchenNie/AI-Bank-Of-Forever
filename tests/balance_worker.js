import fs from "fs";
import BigNumber from "bignumber.js";
import axios from "axios";
import { response } from "express";

/* insecure.. only for testing purposes
   remove when we have a legitimate SSL certificate */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const users = JSON.parse(fs.readFileSync("./initial_users.json"));
const dumpFile = `./balance_dumps/dump_worker_${process.argv[2]}.json`;
const numUsers = users.length;
const baseUrl = process.env.TEST_SERVER == '1' ? "https://ec2-3-138-246-144.us-east-2.compute.amazonaws.com/api" : "http://localhost:8080/api";
const balanceUrl = baseUrl + "/account-info/balance"

let err_count = 0;
for (let i = 0; i < 20; i++) {
    const index = Math.floor(Math.random() * numUsers);

    const userEmail = users[index].email;
    const userPassword = users[index].email.split("@")[0];
    const url = balanceUrl + `/${userEmail}` + `/${userPassword}`;
    try {
        const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 20 * 128000,
                withCredentials: true
            }
        );

        if (response.data.balance == users[index].balance) {
            console.log(`User ${userEmail} in database balance matches expected result of ${response.data.balance}`);
        }
        else {
            err_count++;
            console.error("ERRROORRRR");
        }
    }
    catch (msg) {
        console.error(msg);
    }
}

console.log(`Worker ${process.argv[2]} Finished With ${err_count} Errors.`);