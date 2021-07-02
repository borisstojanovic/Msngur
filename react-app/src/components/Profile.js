import React from "react";
import { Redirect } from 'react-router-dom';
import { useSelector } from "react-redux";
import {Image} from 'cloudinary-react';


const Profile = () => {
    const { user: currentUser } = useSelector((state) => state.auth);

    if (!currentUser) {
        return <Redirect to="/login" />;
    }

    return (
        <div className="container">
            <header className="jumbotron">
                <h3>
                    <strong>{currentUser.username}</strong> Profile
                </h3>
            </header>

            <Image className="profile-img-card" cloudName="dylv4eyvu" publicId={currentUser.path}/>

            <p>
                <strong>Token:</strong> {currentUser.path}
            </p>
            <p>
                <strong>Id:</strong> {currentUser.id}
            </p>
            <p>
                <strong>Email:</strong> {currentUser.email}
            </p>
        </div>
    );
};

export default Profile;