from fastapi import FastAPI, Request, Form, File, UploadFile
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import asyncio
from generate_template import convert_pdf_to_html, clean_html, convert_html_to_pdf
from generate_content import (
    get_content,
    build_prompt,
    add_images_and_styles_with_content,
    remove_images_and_styles,
    write_output,
    check_output,
)

app = FastAPI()

# Mount static file route
app.mount("/html", StaticFiles(directory="generated-html"), name="html")

# Allow CORS from your frontend (adjust origin as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/generate")
async def generate_newsletter(
    topic: str = Form(...),
    content: Optional[str] = Form(None),
    tone: Optional[str] = Form(None),
    pdfTemplate: Optional[UploadFile] = File(None),
):
    pdfBytes = await pdfTemplate.read()

    async def generate():
        yield "data: Received content...\n\n"
        await asyncio.sleep(1)
        print("Received topic:", topic)
        print("Received content:", content)
        print("Received tone:", tone if tone else "None")

        if not pdfTemplate:
            print("No PDF template uploaded.")
            yield "data: No PDF template uploaded\n\n"
            await asyncio.sleep(1)
            yield "data: done|error\n\n"
            await asyncio.sleep(1)

        else:

            file_name = f"generated-html/{pdfTemplate.filename[:-4]}"

            print("STARTING WITH", pdfTemplate.filename)
            yield f"data: Starting with {pdfTemplate.filename}\n\n"
            await asyncio.sleep(1)

            data = await convert_pdf_to_html(pdfBytes, pdfTemplate.filename)
            if not data:
                yield "data: done|error"
                return

            print("Step One: Converted pdf to html")
            yield "data: Step 1: Converted pdf to html\n\n"
            await asyncio.sleep(1)

            cleaned_file = clean_html(file_name)

            print("Step Two: Converted html to template")
            yield "data: Step 2: Converted html to template\n\n"
            await asyncio.sleep(1)

            template, img_srcs, all_styles = remove_images_and_styles(cleaned_file)

            print("Step Three: Preprocessed template for prompting")
            yield "data: Step 3: Preprocessed template for prompting\n\n"
            await asyncio.sleep(1)

            final_prompt = build_prompt(topic, content, tone)
            print("Step Four: Built prompt from from inputs")
            yield "data: Step 4: Built prompt from from inputs\n\n"
            await asyncio.sleep(1)

            attempts = 0
            while attempts < 3:

                llm_output = get_content(template, final_prompt)

                if check_output(llm_output, len(all_styles)):
                    print("Step Five: Recieved content from llm")
                    yield "data: Step 5: Recieved content from llm\n\n"
                    await asyncio.sleep(1)
                    break

                else:
                    attempts += 1
                    if(attempts<3):
                        print("Step Five: Improper Output, Trying Again...")
                        yield "data: Step 5: Improper Output, Trying Again...\n\n"
                        await asyncio.sleep(1)

            if attempts == 3:

                yield "data: LLM failed after 3 attempts.\n\n"
                await asyncio.sleep(1)
                yield "data: done|error\n\n"
                await asyncio.sleep(1)
                return

            else:
                template = add_images_and_styles_with_content(
                    template, llm_output, img_srcs, all_styles
                )

                print("Step Six: Readded removed images and styles")

                yield "data: Step 6: Readded removed images and styles\n\n"
                await asyncio.sleep(1)

                write_output(template)

                print("Step Seven: Created Output File")

                yield "data: Step 7: Created Output File\n\n"
                await asyncio.sleep(1)
                yield "data: done|output.html\n\n"
                await asyncio.sleep(1)
                
                return

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/export")
async def get_pdf_download():
    html_path = f"generated-html/output.html"

    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    done = await convert_html_to_pdf(html_content)

    if not done[0]:
        return done[1]
    
    return FileResponse(
                path="generated-pdf/output.pdf",
                filename="output.pdf",
                media_type="application/pdf"
            )