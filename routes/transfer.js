/***************************************************
 * API 1 and 3
 * used to handle internal and external transactions.
 ***************************************************/
import { RESPONSE, isValidTransferAmount, twoDecimals, SECRET } from "../utils.js";
import { MongoUser } from "../mongodb.js";
import express from "express";
import md5 from "blueimp-md5";

const router = express.Router();

// When a user spends money externally, it goes through the front end and the balance
// of the master account gets deducted.
// The frontend further queries the API to deduct the balance of the user that spent the money.
router.post(
    "/spend",
    async (req, res, next) => {
        const userEmail = req.body.user;
        const spendAmount = req.body.amount;
        const password = req.body.password;
        let error = false;
        if (!userEmail) {
            res.status(RESPONSE.BAD_REQUEST).send("Null user email in request.");
            return next();
        }
        if (!isValidTransferAmount(spendAmount)) {
            res.status(RESPONSE.BAD_REQUEST).send("Amount to transfer is invalid.");
            return next();
        }
        const dbUser = await MongoUser
            .findOne({ email: userEmail })
            .select({ password: 1, balance: 1 })
            .catch(msg => {
                error = true;
                console.log("Internal spend find error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();
        if (dbUser == null) {
            res.status(RESPONSE.NOT_FOUND).send("User not found.");
            return next();
        }

        if (dbUser.password != md5(password, SECRET)) {
            res.status(RESPONSE.INVALID_AUTH).send("Wrong password.");
            return next();
        }

        // this shouldn't happen. Frontend should check that the user has sufficient funds
        // before letting them spend the money from master account.
        if (dbUser.balance < spendAmount) {
            res.status(RESPONSE.BAD_REQUEST).send("Insufficient balance to spend.");
            return next();
        }

        await MongoUser
            .findOneAndUpdate({ email: userEmail }, { balance: twoDecimals(dbUser.balance - spendAmount) })
            .catch(msg => {
                error = true;
                console.log("Internal spend update error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();
        res.status(RESPONSE.OK).send(`Spend success.`);
        return next();
    }
);

// Perform internal transfer.
router.post(
    "/internal",
    async (req, res, next) => {
        console.log("Handling internal transfer");
        const sender = req.body.sender;
        const receiver = req.body.receiver;
        const senderpass = req.body.senderPassword;
        const moneyAmount = req.body.amount;
        if (!isValidTransferAmount(moneyAmount)) {
            res.status(RESPONSE.BAD_REQUEST).send("Amount to transfer is invalid.");
            return next();
        }
        let error = false;
        const sendUser = await MongoUser
            .findOne({ email: sender })
            .select({ password: 1, balance: 1 })
            .catch(msg => {
                error = true;
                console.log("User balance find error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();

        const rcvUser = await MongoUser
            .findOne({ email: receiver })
            .select({ balance: 1 })
            .catch(msg => {
                error = true;
                console.log("User balance find error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();

        if (sendUser == null) {
            res.status(RESPONSE.NOT_FOUND).send("Could not find sender.");
            return next();
        }
        else if (receiver == null) {
            res.status(RESPONSE.NOT_FOUND).send("Could not find receiver.");
            return next();
        }
        else if (sendUser.password != md5(senderpass, SECRET)) {
            res.status(RESPONSE.INVALID_AUTH).send("Sender password invalid.");
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
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();

        await MongoUser
            .findOneAndUpdate({ email: receiver }, { balance: twoDecimals(rcvUser.balance + moneyAmount) })
            .catch(msg => {
                error = true;
                console.log("Internal transfer balance update error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();
        res.status(RESPONSE.OK).send(`Transfer success.`);
        return next();
    }
);

// TODO: add logic for external transfer
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
