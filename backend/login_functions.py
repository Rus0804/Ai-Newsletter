from fastapi import Header, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client, ClientOptions
import requests
import os
import dotenv

dotenv.load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
service = os.getenv("SUPABASE_SERVICE_KEY")

db: Client = create_client(url, key)  
service_db: Client = create_client(url, service)

class LoginRequest(BaseModel):
    email: str
    password: str

def login(request: LoginRequest):
    try:
        response = db.auth.sign_in_with_password(
            {"email": request.email, "password": request.password}
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Login failed: {str(e)}",
        )

    if not response.session.access_token:
        raise HTTPException(
            status_code=400,
            detail="Invalid credentials",
        )

    access_token = response.session.access_token
    user_id = response.user.email  
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_id
    }

def signup(data: LoginRequest):
    try:
        response = db.auth.sign_up({
            "email": data.email,
            "password": data.password
        })
        if response.user:
            user_id = response.user.id
            service_db.table("Profiles").insert({
                "id": user_id,
                "email": data.email
            }).execute()
        return {"message": "User created successfully. Check your email to confirm your account."}
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"message": "duplicate key value violates unique constraint"}
        )
        raise HTTPException(status_code=500, detail=str(e))

def get_user_id_from_token(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    
    token = authorization.removeprefix("Bearer ").strip()
    
    try:
        user_response = db.auth.get_user(token)
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {str(e)}")

class ResetPasswordRequest(BaseModel):
    access_token: str
    new_password: str

def reset_password(req: ResetPasswordRequest):
    # Use Supabase Admin API to update the user password
    headers = {
        "apikey": service,
        "Authorization": f"Bearer {service}",
        "Content-Type": "application/json"
    }

    # Get user info from token
    user_info_res = requests.get(
        f"{url}/auth/v1/user",
        headers={
            "Authorization": f"Bearer {req.access_token}",
            "apikey": key
        }
    )

    if user_info_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid access token")

    user_id = user_info_res.json()["id"]

    # Update user password
    update_res = requests.put(
        f"{url}/auth/v1/admin/users/{user_id}",
        headers=headers,
        json={"password": req.new_password}
    )

    if update_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to update password")
    
    return {"message": "Password updated successfully"}


class ResetRequest(BaseModel):
    email: EmailStr


async def request_password_reset(payload: ResetRequest, request: Request):

    try:
        response = db.table("Profiles").select("*").eq("email", payload.email).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check email: {str(e)}")
    
    if (len(response.data)==0):
        return {"message": "Incorrect Email"}
    
    origin = request.headers.get("origin")
    redirect_url = f"{origin}/reset-password"
    print(redirect_url)
    response = db.auth.reset_password_email(
        email=payload.email,
        options={"redirect_to": redirect_url}
    )
    if(response is not None):
        if response.get("error"):
            raise HTTPException(status_code=400, detail=response["error"]["message"])

    return {"message": "Reset link sent"}
