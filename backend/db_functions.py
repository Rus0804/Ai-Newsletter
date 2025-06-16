from fastapi import Header, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client, ClientOptions
from datetime import datetime, timezone
import requests
import os
import dotenv

dotenv.load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
service = os.getenv("SUPABASE_SERVICE_KEY")

def get_user_db(token: str) -> Client:
    opts = ClientOptions(headers=  {"Authorization": f"Bearer {token}"})
    return create_client(url, key, options=opts)

async def save_draft(request: Request):
    token = request.headers.get("authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = token[7:]
    user_db = get_user_db(token)

    data = await request.json()
    vno = data.get("version")
    filename = data.get("fname")
    projID = data.get("projID")
    project = data.get("projectData")
    html = data.get("html")

    try:
        if not projID:
            response = user_db.from_("all files").insert({
                "version": vno,
                "file_name": filename,
                "project_data": project,
            }).execute()

            projID = response.data[0]['file_id']

            response = user_db.from_("latest files").insert({
                "version": vno,
                "file_id": projID,
                "file_name": filename,
                "project_data": project,
            }).execute()

        else:
            response = user_db.from_("all files").insert({
                "version": vno,
                "file_id": projID,
                "file_name": filename,
                "project_data": project,
            }).execute()

            current_time = datetime.now(timezone.utc)

            response = user_db.from_("latest files").update({
                "version": vno,
                "file_name": filename,
                "project_data": project,
                "edited_at":  current_time.isoformat()
            }).eq("file_id", projID).execute()
            
        return projID
    except Exception as e:
        print("Exception:", e)
        if (e.message == 'JWT expired'):
            raise HTTPException(status_code=401, detail="User Session Timed Out")
        raise HTTPException(status_code=500, detail=f"Failed to create save: {str(e)}")