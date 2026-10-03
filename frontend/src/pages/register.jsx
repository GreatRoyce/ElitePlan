import React from "react";
import { useNavigate } from "react-router-dom";
import SignUpForm from "../components/Auth/signupform";

function Register() {
  const navigate = useNavigate();

  const handleSuccess = () =>
    navigate("/login", {
      state: {
        message:
          "Registration successful! Please enter your login credentials.",
      },
    });

  return <SignUpForm layout="page" onSuccess={handleSuccess} />;
}

export default Register;
