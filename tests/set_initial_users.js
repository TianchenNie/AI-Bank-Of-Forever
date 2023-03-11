import { getAllUsers } from "./test_utils.js";
import fs from "fs";

const baseUrl = process.env.TEST_SERVER == '1' ? "http://ec2-3-138-246-144.us-east-2.compute.amazonaws.com/api" : "http://localhost:8080/api";
const getUrl = baseUrl + "/testing/all-users";
const retrieved = await getAllUsers(getUrl);
const actualUsers = retrieved.map(user => {
    return {
        email: user.email,
        password: user.password,
        balance: user.balance,
        moneyRequestHistory: user.moneyRequestHistory
    };
});
actualUsers.sort((user1, user2) => {
    if (user1.email < user2.email) {
        return -1;
    }
    if (user1.email > user2.email) {
        return 1;
    }
    return 0;
});

fs.writeFileSync("./initial_users.json", JSON.stringify(actualUsers, null, 2));
