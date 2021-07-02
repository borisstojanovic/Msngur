import axios from "axios";
import FormData from "form-data";

const API_URL = "http://localhost:8080/auth/";

const register = (username, email, password, password2, image) => {
    let formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("password2", password2);
    formData.append("image", image);
    return axios.post(API_URL + "register", formData, {
        headers: {
            'accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.8',
            'Content-Type': `multipart/form-data;`,
    }});
};

const login = (username, password) => {
    return axios
        .post(API_URL + "signin", {
            username,
            password,
        })
        .then((response) => {
            if (response.data.accessToken) {
                localStorage.setItem("user", JSON.stringify(response.data));
            }

            return response.data;
        });
};

const logout = () => {
    localStorage.removeItem("user");
};

const auth = {
    register,
    login,
    logout
}

export default auth;