import * as chai from "chai";
import { createUsersWithRandBalances, clearCollection, createUsersWithRandHistories } from "./test_utils.js";

const numUsers = 50;
describe("** Account Info Test Suite **", function () {
    const expect = chai.expect;
    const clearUrl = "http://localhost:8080/api/testing/clear-users";
    console.log(`Account info test`);
    it(`1. Test account balance retrieval of ${numUsers} users.`, async function () {
        this.timeout(5000000);
        await clearCollection(clearUrl);
        const postUrl = "http://localhost:8080/api/testing/new-with-balance";
        const generatedUsers = await createUsersWithRandBalances(postUrl, numUsers);
        for (const user of generatedUsers) {
            const getUrl = `http://localhost:8080/api/account-info/balance/${user.email}/${user.password}`;
            await fetch(getUrl, {
                method: 'GET', // *GET, POST, PUT, DELETE, etc.
                mode: 'cors', // no-cors, *cors, same-origin
                cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                credentials: 'same-origin', // include, *same-origin, omit
                headers: {
                    'Content-Type': 'application/json'
                    // 'Content-Type': 'application/x-www-form-urlencoded',
                },
                redirect: 'follow', // manual, *follow, error
                referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            })
            .then(responseString => responseString.json())
            .then(response => {
                /* the account balance retrieved should match the balance of the created user. */
                // console.log("RESPONSE: ", response);
                // console.log("BALANCE: ", user.balance.toFixed(2));
                expect(response.balance).to.equal(user.balance);
            });
        }
        await clearCollection(clearUrl);
    });
    it(`2. Test request history retrieval of ${numUsers} users.`, async function () {
        const maxHistoryLength = 200;
        this.timeout(500000);
        await clearCollection(clearUrl);
        const postUrl = "http://localhost:8080/api/testing/new-with-history";
        const generatedUsers = await createUsersWithRandHistories(postUrl, numUsers, maxHistoryLength);

        for (const user of generatedUsers) {
            const getUrl = `http://localhost:8080/api/account-info/request-history/${user.email}/${user.password}`;
            await fetch(getUrl, {
                method: 'GET', // *GET, POST, PUT, DELETE, etc.
                mode: 'cors', // no-cors, *cors, same-origin
                cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                credentials: 'same-origin', // include, *same-origin, omit
                headers: {
                    'Content-Type': 'application/json'
                    // 'Content-Type': 'application/x-www-form-urlencoded',
                },
                redirect: 'follow', // manual, *follow, error
                referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            })
            .then(responseString => responseString.json())
            .then(response => {
                /* convert timeCreated to millisecond form */
                const retrievedHistory = response.map((entry) => {
                    const created = new Date(entry.timeCreated);
                    const captured = entry.timeCaptured != null ? new Date(entry.timeCaptured) : null;
                    return {
                        ...entry,
                        timeCreated: created.getTime(),
                        timeCaptured: captured != null ? captured.getTime() : null,
                    }
                });
                expect(retrievedHistory).to.deep.equal(user.history);
            });
        }
        await clearCollection(clearUrl);

    });
});

