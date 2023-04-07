import fs from "fs";
import { createUsers, createUsersWithRandBalances, } from "./test_utils.js";

/* insecure.. only for testing purposes
   remove when we have a legitimate SSL certificate */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const dumpFile = `./user_creation_worker_dumps/dump_worker_${process.argv[2]}.json`;
const baseUrl = process.env.TEST_SERVER == '1' ? "https://ec2-3-138-246-144.us-east-2.compute.amazonaws.com/api" : "http://localhost:8080/api";
const creationUrl = baseUrl + "/user-info/new";

const generatedUsers = await createUsersWithRandBalances(creationUrl, 50);

fs.writeFileSync(dumpFile, JSON.stringify(generatedUsers));
console.log(`Worker ${process.argv[2]} Finished.`);