from fastapi import Request, HTTPException  # type: ignore
from supabase import create_client, Client, ClientOptions  # type: ignore
from playwright.async_api import async_playwright  # type: ignore
from datetime import datetime, timezone
import os
import dotenv

dotenv.load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
service = os.getenv("SUPABASE_SERVICE_KEY")


async def generate_thumbnail_from_html_string(
    html: str, width: int = 800, height: int = 600
) -> bytes:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_viewport_size({"width": width, "height": height})
        await page.set_content(html, wait_until="load")
        screenshot = await page.screenshot(full_page=True, type="png")
        await browser.close()
        return screenshot


def get_user_db(token: str) -> Client:
    opts = ClientOptions(headers={"Authorization": f"Bearer {token}"})
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

    project = data.get("projectData")
    html = data.get("html")

    thumbnail = await generate_thumbnail_from_html_string(html=html)

    projID = data.get("projID")
    if projID == "null":
        projID = None

    try:
        if not projID:

            response = (
                user_db.from_("all files")
                .insert(
                    {
                        "version": vno,
                        "file_name": filename,
                        "project_data": project,
                    }
                )
                .execute()
            )

            projID = response.data[0]["file_id"]

            response = user_db.storage.from_("newsletter-thumbnails").upload(
                file=thumbnail, path=f"{projID}.png", file_options={"content-type": "image/*","upsert": "true"}
            )
            thumbnail_path = f"{projID}.png"

            response = (
                user_db.from_("latest files")
                .insert(
                    {
                        "version": vno,
                        "file_id": projID,
                        "file_name": filename,
                        "project_data": project,
                        "thumbnail_path": thumbnail_path
                    }
                )
                .execute()
            )

        else:
            response = (
                user_db.from_("all files")
                .insert(
                    {
                        "version": vno,
                        "file_id": projID,
                        "file_name": filename,
                        "project_data": project,
                    }
                )
                .execute()
            )

            response = user_db.storage.from_("newsletter-thumbnails").upload(
                file=thumbnail, path=f"{projID}.png", file_options={"content-type": "image/*","upsert": "true"}
            )

            current_time = datetime.now(timezone.utc)

            response = (
                user_db.table("latest files")
                .update(
                    {
                        "version": vno,
                        "file_name": filename,
                        "project_data": project,
                        "edited_at": current_time.isoformat(),
                    }
                )
                .eq("file_id", projID)
                .execute()
            )

        return projID
    except Exception as e:
        print("Exception:", e)
        if "JWT expired" in str(e):
            raise HTTPException(status_code=401, detail="User Session Timed Out")
        raise HTTPException(status_code=500, detail=f"Failed to create save: {str(e)}")


async def get_newsletters(request: Request):

    token = request.headers.get("authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = token[7:]
    user_db = get_user_db(token)

    data = await request.json()
    proj_type = data.get("type")

    try:

        response = (
            user_db.from_("latest files")
            .select("*")
            .order("edited_at", desc=True)
            .eq("project_status", proj_type)
            .execute()
        )

        rows = response.data

        for i in range(len(rows)):
            path = rows[i]["thumbnail_path"]
            if path:
                url = user_db.storage.from_("newsletter-thumbnails").get_public_url(path = path, options = {"download": False})
                rows[i]["thumbnail_url"] = url

        return rows

    except Exception as e:
        print("Exception:", e)
        if "JWT expired" in str(e):
            raise HTTPException(status_code=401, detail="User Session Timed Out")
        raise HTTPException(status_code=500, detail=f"Failed to create save: {str(e)}")


async def get_all_versions(request: Request):

    token = request.headers.get("authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = token[7:]
    user_db = get_user_db(token)

    data = await request.json()
    proj_id = data.get("file_id")

    try:

        response = (
            user_db.from_("all files")
            .select("*")
            .eq("file_id", proj_id)
            .order("version", desc=True)
            .execute()
        )

        return response.data

    except Exception as e:
        print("Exception:", e)
        if "JWT expired" in str(e):
            raise HTTPException(status_code=401, detail="User Session Timed Out")
        raise HTTPException(status_code=500, detail=f"Failed to create save: {str(e)}")


async def delete_files(request: Request):

    token = request.headers.get("authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = token[7:]
    user_db = get_user_db(token)

    data = await request.json()
    proj_id = data.get("fileID")
    version = data.get("version")
    latest = data.get("latest")

    try:
        if version != 0:
            delete_response = (
                user_db.from_("all files")
                .delete()
                .eq("file_id", proj_id)
                .eq("version", version)
                .execute()
            )

            if latest:
                next_latest_response = (
                    user_db.from_("all files")
                    .select()
                    .eq("file_id", proj_id)
                    .eq("version", version - 1)
                    .execute()
                )
                row = next_latest_response.data[0]

                update_response = (
                    user_db.from_("latest files")
                    .update(
                        {
                            "version": row["version"],
                            "file_name": row["file_name"],
                            "project_data": row["project_data"],
                            "edited_at": row["created_at"],
                        }
                    )
                    .eq("file_id", proj_id)
                    .execute()
                )
                return update_response.data
            else:
                return delete_response.data
        else:
            response = (
                user_db.from_("all files").delete().eq("file_id", proj_id).execute()
            )
            response = (
                user_db.from_("latest files").delete().eq("file_id", proj_id).execute()
            )
            thumbnail_path = response.data[0]["thumbnail_path"]
            storage_response = (
                user_db.storage.from_("newsletter-thumbnails").remove([thumbnail_path])
            )
            return response.data

    except Exception as e:
        print("Exception:", e)
        if "JWT expired" in str(e):
            raise HTTPException(status_code=401, detail="User Session Timed Out")
        raise HTTPException(status_code=500, detail=f"Failed to create save: {str(e)}")


async def update_file(request: Request, column: str):

    token = request.headers.get("authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = token[7:]
    user_db = get_user_db(token)

    data = await request.json()
    proj_id = data.get("file_id")
    new_data = data.get(column)

    try:

        response = (
            user_db.from_("latest files")
            .update({column: new_data})
            .eq("file_id", proj_id)
            .execute()
        )

        if column == "file_name":
            row = response.data[0]
            response = (
                user_db.from_("all files")
                .update({column: new_data})
                .eq("file_id", proj_id)
                .eq("version", row["version"])
                .execute()
            )

        return response.data

    except Exception as e:
        print("Exception:", e)
        if "JWT expired" in str(e):
            raise HTTPException(status_code=401, detail="User Session Timed Out")
        raise HTTPException(status_code=500, detail=f"Failed to create save: {str(e)}")
