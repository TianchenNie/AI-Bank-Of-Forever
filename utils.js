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

export const SECRET = "The AI Bank Of Forever Is A Great Bank!"

export function isValidEmail(email) {
    return /^\S+@\S+\.\S+$/.test(email);
}

export function isValidMoneyAmount(num) {
    return typeof num == "string" && /^[-]{0,1}(\d*)\.(\d){2}$/.test(num);
}

/* Tranfer amount can only be a postive whole number, or a postive 2 decimal number */
export function isValidTransferAmount(num) {
    const atMostTwoDecimals = /^\d+(\.\d{1,2})?$/;
    return typeof num == "number" && num >= 0 && atMostTwoDecimals.test(String(num));
}

// Round num to two decimals, deals with invalid addition error e.g. 0.1 + 0.2
export function twoDecimals(num) {
    return parseFloat(num.toFixed(2));
}