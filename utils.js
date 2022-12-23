import dontenv from "dotenv";

dontenv.config();

export const RESPONSE = Object.freeze({
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    INVALID_AUTH: 401,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERR: 500,
    SERVICE_UNAVAILABLE: 503,
});

export const PORT = process.env.LIVE ? process.env.LIVE_PORT : process.env.LOCAL_PORT;
export const DB_USERNAME = process.env.DB_USERNAME;
export const DB_PASSWORD = process.env.DB_PASSWORD;
export const SECRET = process.env.MD5_SECRET;
export const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
export const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
export const SERVER_BASE_URL = process.env.LIVE ? process.env.SERVER_BASE_URL : LOCALHOST_BASE_URL;

export function isValidEmail(email) {
    return /^\S+@\S+\.\S+$/.test(email);
}

/* Transfer amount can only be a postive whole number, or a postive 2 decimal number */
export function isValidTransferAmount(num) {
    const atMostTwoDecimals = /^\d+(\.\d{1,2})?$/;
    return typeof num == "number" && num >= 0 && atMostTwoDecimals.test(String(num));
}

/* Request amount can only be a postive whole number, or a postive 2 decimal number, and must be less than 9999999.99 */
export function isValidRequestAmount(num) {
    const atMostTwoDecimals = /^\d+(\.\d{1,2})?$/;
    return typeof num == "number" && num >= 0 && num <= 9999999.99 && atMostTwoDecimals.test(String(num));
}

// Round num to two decimals, deals with invalid addition error e.g. 0.1 + 0.2
export function twoDecimals(num) {
    return parseFloat(num.toFixed(2));
}