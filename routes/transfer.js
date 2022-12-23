/***************************************************
 * API 1 and 3
 * used to handle internal and external transactions.
 ***************************************************/
import fetch from "node-fetch";
import {
    PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, RESPONSE, SERVER_BASE_URL,
    isValidTransferAmount, isValidRequestAmount, twoDecimals, SECRET
} from "../utils.js";
import * as uuid from "uuid";
import paypal from "@paypal/checkout-server-sdk";
import { User } from "../mongodb.js";
import express from "express";
import md5 from "blueimp-md5";


// TODO: update after go live, this link is for sandbox environment.
const base = "https://api.sandbox.paypal.com";

const requestStatus = Object.freeze({
    PENDING_APPROV: "pending-approval",
    CAPTURED: "captured-by-server",
});
// get access token
// Note need to recall as access tokens can expire.
// Handle 401 no auth from paypal.
async function getAccessToken() {
    let accessToken = "";
    const authUrl = "https://api-m.sandbox.paypal.com/v1/oauth2/token";
    const clientIdAndSecret = `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`;
    const base64 = Buffer.from(clientIdAndSecret).toString('base64');
    await fetch(authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Language': 'en_US',
                'Authorization': `Basic ${base64}`,
            },
            body: 'grant_type=client_credentials'
        })
        .then(response => response.json())
        .then(data => {
            accessToken = data.access_token;
        })
        .catch(err => console.error("Couldn't get auth token with err: " + err));

    return accessToken;
};

async function capturePayment(captureUrl) {
    let error = false;
    // const url = `${base}/v2/checkout/orders/${orderId}/capture`;
    const response = await fetch(captureUrl, {
            method: "post",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
        })
        .catch(err => {
            error = true;
            console.error("Error while fetching capturePayment " + err);
        });
    if (error) return null;
    const data = await response.json();
    return data;
}

let accessToken = await getAccessToken();
console.log("Got Access Token:", accessToken);
const router = express.Router();

// TODO: update SandboxEnvironment after we go live.
const paypalClient = new paypal.core.PayPalHttpClient(new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET));
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
        const dbUser = await User
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

        await User
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
        const sendUser = await User
            .findOne({ email: sender })
            .select({ password: 1, balance: 1 })
            .catch(msg => {
                error = true;
                console.log("User balance find error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();

        const rcvUser = await User
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
        else if (rcvUser == null) {
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
        await User
            .findOneAndUpdate({ email: sender }, { balance: twoDecimals(sendUser.balance - moneyAmount) })
            .catch(msg => {
                error = true;
                console.log("Internal transfer balance update error: ", msg);
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();

        await User
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


// Flow: receive request from frontend, create request and return redirect link to user
// user navigates to link and approves, frontend calls capture of backend,
// capture then updates user balnces.
// https://developer.paypal.com/docs/checkout/standard/integrate/
// https://developer.paypal.com/docs/api/orders/v2/#error-ORDER_NOT_APPROVED
router.post(
    "/external/create-request",
    async (req, res, next) => {
        let uniqueId;
        let error = false;
        const requestorEmail = req.body.email;
        const requestorPassword = req.body.password;
        const moneyAmount = req.body.amount;
        if (!isValidRequestAmount(moneyAmount)) {
            res.status(RESPONSE.BAD_REQUEST).send("Amount to request is invalid. Must be less than or equal to 9999999.99.");
            return next();
        }

        const user = await User
            .findOne({ email: requestorEmail })
            .select({ password: 1 })
            .catch(msg => {
                error = true;
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            });

        if (error) return next();
        if (user == null) {
            req.status(RESPONSE.NOT_FOUND).send("User not found.");
            return next();
        }

        if (md5(requestorPassword, SECRET) != user.password) {
            req.status(RESPONSE.INVALID_AUTH).send("Invalid password");
            return next();
        }

        const request = new paypal.orders.OrdersCreateRequest();
        const total = moneyAmount;
        request.prefer("return=representation");
        uniqueId = uuid.v4();

        const amount = {
            currency_code: 'CAD',
            value: total,
            breakdown: {
                item_total: {
                    currency_code: 'CAD',
                    value: total
                }
            }
        };

        const items = [{
            name: `Money Request From ${requestorEmail}`,
            unit_amount: {
                currency_code: "CAD",
                value: total
            },
            quantity: 1
        }];

        request.requestBody({
            intent: "CAPTURE",
            purchase_units: [
                {
                    amount: amount,
                    items: items,
                }
            ],
            application_context: {
                shipping_preference: "NO_SHIPPING",
                user_action: "PAY_NOW",
                return_url: `${SERVER_BASE_URL}/api/transfer/external/capture-request/${requestorEmail}/${uniqueId}`
            },

        });
	console.log("Return url: " + `${SERVER_BASE_URL}/api/transfer/external/capture-request/${requestorEmail}/${uniqueId}`);
        const order = await paypalClient
            .execute(request)
            .catch(err => {
                error = true;
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send(err);
            });
        console.log("ORDER: ", order);
        if (error) return next();
        const orderId = order.result.id;
        const captureLinkObj = Array.isArray(order.result.links) && order.result.links.find((obj) => obj.rel == "capture");
        const viewLinkObj = Array.isArray(order.result.links) && order.result.links.find((obj) => obj.rel == "self");
        const approveLinkObj = Array.isArray(order.result.links) && order.result.links.find((obj) => obj.rel == "approve");
        if (!captureLinkObj || !viewLinkObj || !approveLinkObj) {
            res.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            console.log("Unexpected capture/view link.");
            return next();
        }

        const newMoneyRequest = {
            serverId: uniqueId,
            orderId: orderId,
            status: requestStatus.PENDING_APPROV,
            amount: moneyAmount,
            captureUrl: captureLinkObj.href,
            viewUrl: viewLinkObj.href,
            timeCreated: Date.now(),
            timeCaptured: null,
        };

        await User
            .updateOne({ email: requestorEmail }, {
                $push: { moneyRequestHistory: newMoneyRequest }
            })
            .catch(err => {
                error = true;
                res.status(RESPONSE.INTERNAL_SERVER_ERR).send(err);
            });

        if (error) return next();
        res.status(RESPONSE.OK).send(approveLinkObj.href);
        return next();
    }
);

router.get(
    "/external/capture-request/:email/:uniqueId",
    async (req, res, next) => {
        console.log("Capturing request.");
	let error = false;
        const email = req.params.email;
        const uniqueId = req.params.uniqueId;
        if (!uuid.validate(uniqueId)) {
            res.status(RESPONSE.INVALID_AUTH).send("Invalid Order Unique Id.");
            return next();
        }
        const user = await User
            .findOne({ email: email })
            .select({ moneyRequestHistory: 1, balance: 1 })
            .catch(err => {
                error = true;
                req.status(RESPONSE.INTERNAL_SERVER_ERR).send(err);
            });

        if (error) return next();
        if (!user) {
            req.status(RESPONSE.NOT_FOUND).send("User not found.");
            return next();
        }
        const order = user.moneyRequestHistory.find((request) => request.serverId == uniqueId);
        if (!order) {
            res.status(RESPONSE.NOT_FOUND).send("Order not found.");
            return next();
        }
        if (order.status != requestStatus.PENDING_APPROV) {
            res.status(RESPONSE.CONFLICT).send("Order already captured.");
            return next();
        }
        const captureRes = await (capturePayment(order.captureUrl, accessToken));
        console.log("Capture Payment Response: ", captureRes);
        if (captureRes == null) {
            req.status(RESPONSE.INTERNAL_SERVER_ERR).send();
            return next();
        }

        // TODO: may need to synchronize for multiple, parallel captures.
        order.status = requestStatus.CAPTURED;
        order.timeCaptured = Date.now();
        await User
            .updateOne({ email: email }, {
                moneyRequestHistory: user.moneyRequestHistory,
                balance: twoDecimals(user.balance + order.amount)
            })
            .catch(err => {
                error = true;
                req.status(RESPONSE.INTERNAL_SERVER_ERR).send(err);
            });

        if (error) return next();

        res.status(RESPONSE.OK).send("Transfer Success.");
        return next();
    }
);


export default router;
