import { SECRET } from "../utils.js";
import * as chai from "chai";
import md5 from "blueimp-md5";
import { createUsersWithDuplicates, clearCollection } from "./test_utils.js";

const numUsers = 50;
describe("** User Creation Test Suite **", function () {
    const expect = chai.expect;
    const postUrl = "http://localhost:8080/api/user-info/new";
    const getUrl = "http://localhost:8080/api/testing/all-users";
    const clearUrl = "http://localhost:8080/api/testing/clear-users";
    it(`1. Create ${numUsers} users with duplicates on localhost.`, async function () {
        this.timeout(5000000);
        await clearCollection(clearUrl);
        const generatedUsers = await createUsersWithDuplicates(postUrl, numUsers);
        let retrieved;

        /* fetch all users in the database */
        await fetch(getUrl, {
            method: 'GET',
            mode: 'cors', 
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer', 
        })
        .then(responseString => responseString.json())
        .then(response => retrieved = response)
        .catch(err => console.error(err));

        const expectedUsers = generatedUsers.map(user => {
            return {
                email: user.email,
                password: md5(user.password, SECRET)
            };
        });

        const actualUsers = retrieved.map(user => {
            return {
                email: user.email,
                password: user.password
            };
        });

        expectedUsers.sort((user1, user2) => {
            if (user1.email < user2.email) {
                return -1;
            }
            if (user1.email > user2.email) {
                return 1;
            }
            return 0;
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

        expect(actualUsers).to.deep.equal(expectedUsers);
        await clearCollection(clearUrl);
    });
});

