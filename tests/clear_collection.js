import { clearCollection } from "./test_utils.js";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const baseUrl = process.env.TEST_SERVER == '1' ? "https://ec2-3-138-246-144.us-east-2.compute.amazonaws.com/api" : "http://localhost:8080/api";
const clearUrl = baseUrl + "/testing/clear-users";
await clearCollection(clearUrl);