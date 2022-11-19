/***************************************************
 * API 1 and 3
 * used to handle internal and external transactions.
 ***************************************************/
import { RESPONSE, isValidTransferAmount, twoDecimals } from "../utils.js";
import { MongoUser } from "../mongodb.js";
import express from "express";

const router = express.Router();
// Perform transfer.
// TODO: add logic for external transfer
router.post(
    "/internal",
    async (req, res, next) => {
        console.log("Handling internal transfer");
        const sender = req.body.sender;
        const receiver = req.body.receiver;
        const moneyAmount = req.body.amount;
        if (!isValidTransferAmount(moneyAmount)) {
            res.status(RESPONSE.BAD_REQUEST).send("Amount to transfer is invalid.");
            return next();
        }
        let error = false;
        const sendUser = await MongoUser
            .findOne({ email: sender })
            .select({ balance: 1 })
            .catch(msg => {
                error = true;
                console.log("User balance find error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send(`Could not fetch user in db.`);
            });

        if (error) return next();

        const rcvUser = await MongoUser
            .findOne({ email: receiver })
            .select({ balance: 1 })
            .catch(msg => {
                error = true;
                console.log("User balance find error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send(`Could not fetch user in db.`);
            });

        if (error) return next();

        if (sendUser == null && rcvUser == null) {
            res.status(RESPONSE.NOT_FOUND).send("Could not find users.");
            return next();
        }
        // if the sender is an external user
        else if (sendUser == null) {
            res.status(RESPONSE.SERVICE_UNAVAILABLE).send("External transfers not supported yet.");
            return next();
        }
        // if the receiver is an external user
        else if (rcvUser == null) {
            res.status(RESPONSE.SERVICE_UNAVAILABLE).send("External transfers not supported yet.");
            return next();
        }
        else if (sendUser.balance < moneyAmount) {
            res.status(RESPONSE.BAD_REQUEST).send(`Insufficient funds in account of sending user ${sender}.`);
            return next();
        }
        // perform transfer for internal users
        await MongoUser
            .findOneAndUpdate({ email: sender }, { balance: twoDecimals(sendUser.balance - moneyAmount) })
            .catch(msg => {
                error = true;
                console.log("Internal transfer balance update error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send(`Update error.`);
            });

        if (error) return next();

        await MongoUser
            .findOneAndUpdate({ email: receiver }, { balance: twoDecimals(rcvUser.balance + moneyAmount) })
            .catch(msg => {
                error = true;
                console.log("Internal transfer balance update error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send(`Update error.`);
            });

        if (error) return next();
        res.status(RESPONSE.OK).send(`Transfer success.`);
        return next();
    }
);

// https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
router.post(
    "/external/payout",
    (req, res, next) => {
        next();
    }
);

// https://developer.paypal.com/docs/api/invoicing/v2/
router.post(
    "/external/invoice",
    (req, res, next) => {
        next();
    }
);

export default router;