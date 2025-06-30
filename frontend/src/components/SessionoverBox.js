import React from "react";
import { useNavigate } from "react-router-dom";

function SessionDialogBox(){
    const navigate = useNavigate();
    return(
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Session Timed Out</h3>
            <p>Your session has expired. Please log in again.</p>
            <button
              className="logout-button"
              onClick={() => {
                localStorage.clear();
                navigate("/login");
              }}
            >
              Go to Login
            </button>
          </div>
        </div> 
    );
}

export default SessionDialogBox