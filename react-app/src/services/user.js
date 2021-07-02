import axios from "axios";
import authHeader from "./auth-header";

const API_URL = "http://localhost:8080/users/";

const getAll = () => {
    return axios.get(API_URL + "all" , { headers: authHeader()});
};

const getUsersByUsername = (username) => {
    return axios.get(API_URL + "getByUsernameLike/" + username, { headers: authHeader()});
};

const getUserById = (id) => {
    return axios.get(API_URL + "getById/" + id, { headers: authHeader()});
};

const startConversation = (id) => {
    return axios.post(API_URL + "addConversation",{user: id} , { headers: authHeader()});
};

const user = {
    getAll,
    getUsersByUsername,
    getUserById,
    startConversation
}

export default user;