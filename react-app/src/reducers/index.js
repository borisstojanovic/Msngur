import { combineReducers } from "redux";
import auth from "./auth";
import message from "./apiMessage";

export default combineReducers({
    auth,
    message,
});