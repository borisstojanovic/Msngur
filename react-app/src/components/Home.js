import React, { useState, useEffect } from "react";

import UserService from "../services/user";

const Home = () => {
    const [content, setContent] = useState("");

    useEffect(() => {
        UserService.getAll().then(
            (response) => {
                setContent(response.data[0].email);
            },
            (error) => {
                const message =
                    (error.response && error.response.data) ||
                    error.message ||
                    error.toString();

                setContent(message.message);
            }
        );
    }, []);

    return (
        <div className="container">
            <header className="jumbotron">
                <h3>{content}</h3>
            </header>
        </div>
    );
};

export default Home;