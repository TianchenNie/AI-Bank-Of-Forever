export const RESPONSE = Object.freeze({
    OK: 200,
    BAD_REQUEST: 400,
    INVALID_AUTH: 401,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERR: 500,
    SERVICE_UNAVAILABLE: 503,
});

export function isValidEmail(email) {
    return /^\S+@\S+\.\S+$/.test(email);
}

export function isValidMoneyAmount(num) {
    return typeof num == "string" && /^[-]{0,1}(\d*)\.(\d){2}$/.test(num);
}

export function isValidTransferAmount(num) {
    return typeof num == "number" && /^(\d*)\.(\d){2}$/.test(String(num));
}

// Round num to two decimals, deals with invalid addition error e.g. 0.1 + 0.2
export function twoDecimals(num) {
    return parseFloat(num.toFixed(2));
}