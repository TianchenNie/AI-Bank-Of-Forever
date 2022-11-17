import { RESPONSE, isValidTransferAmount, twoDecimals } from "./utils.js";
import { users } from "./data.js";

export function initTransferEndpoint(app) {
    // Perform transfer.
    // TODO: add logic for external transfer
    app.post(
        "/api/transfer",
        (req, res) => {
            console.log(users);
            const sender = req.body.sender;
            const receiver = req.body.receiver;
            const moneyAmount = req.body.amount;
            if (!users[sender] && !users[receiver]) {
                res.status(RESPONSE.NOT_FOUND).send("Could not find users.");
                return;
            }
            else if (!isValidTransferAmount(moneyAmount)) {
                res.status(RESPONSE.BAD_REQUEST).send("Amount to transfer is invalid.");
                return;
            }
            // if the sender is an external user
            else if (!users[sender]) {
                res.status(RESPONSE.SERVICE_UNAVAILABLE).send("External transfers not supported yet.");
                return;
            }
            // if the receiver is an external user
            else if (!users[receiver]) {
                res.status(RESPONSE.SERVICE_UNAVAILABLE).send("External transfers not supported yet.");
                return;
            }
            else if (users[sender].balance < moneyAmount) {
                res.status(RESPONSE.BAD_REQUEST).send(`Insufficient funds in account of sending user ${sender}.`);
                return;
            }
            // perform transfer for internal users
            users[receiver].balance = twoDecimals(users[receiver].balance + moneyAmount);
            users[sender].balance = twoDecimals(users[sender].balance - moneyAmount);
            res.status(RESPONSE.OK).send(`Sender new balance: ${users[sender].balance}\nReceiver new balance: ${users[receiver].balance}`);
            console.log(users);
        }
    );
}