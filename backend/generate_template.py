import base64
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os

load_dotenv()

CONVERT_API_SECRET = os.getenv("CONVERT_API_SECRET")

async def convert_pdf_to_html(fileBytes, filename):

    file_content = base64.b64encode(fileBytes).decode("utf-8")

    payload = {
        "Parameters": [
            {
                "Name": "File",
                "FileValue": {
                    "Name": filename,
                    "Data": file_content
                }
            },
            {
                "Name": "StoreFile",
                "Value": True
            }
        ]
    }

    headers = {
        "Authorization": f"Bearer {CONVERT_API_SECRET}",
        "Content-type": "application/json"
    }

    response = requests.post("https://v2.convertapi.com/convert/pdf/to/html", json=payload, headers=headers)

    if response.status_code == 200:
        download_url = response.json()["Files"][0]["Url"]
        html_response = requests.get(download_url)
        with open(f"generated-html/{filename[:-4]}.html", "wb") as f:
            f.write(html_response.content)

        return True, None
    else:
        return False, response
    
async def convert_html_to_pdf(html_content: str):

    file_content = base64.b64encode(html_content.encode("utf-8")).decode("utf-8")

    payload = {
        "Parameters": [
            {
                "Name": "File",
                "FileValue": {
                    "Name": "output.html",
                    "Data": file_content
                }
            },
            {
                "Name": "StoreFile",
                "Value": True
            },
            {
                "Name": "BreakAfterElements",
                "Value": ".page"
            },
            {
                "Name": "PageSize",
                "Value": "A4"
            },
            {
                "Name": "RespectViewport",
                "Value": False
            },
        ]
    }

    headers = {
        "Authorization": f"Bearer {CONVERT_API_SECRET}",
        "Content-type": "application/json"
    }

    response = requests.post("https://v2.convertapi.com/convert/html/to/pdf", json=payload, headers=headers)

    if response.status_code == 200:
        download_url = response.json()["Files"][0]["Url"]
        pdf_response = requests.get(download_url)
        with open(f"generated-pdf/output.pdf", "wb") as f:
            f.write(pdf_response.content)
        return True, None
    else:
        return False, response


def combine_text(html_block):
    class_to_placeholder = {
        'table-paragraph': '{{ body }}',
        'heading-1': '{{ heading }}',
        'heading-2': '{{ heading }}',
        'body-text': '{{ body }}',
        'title': '{{ title }}',
        'heading-3': '{{ heading }}',
        'list-paragraph': '{{ body }}',
        'paragraph': '{{ body }}'
        }
    if html_block.name == 'p':
        for span in html_block.find_all('span'):
            span.unwrap()
        
        block_class = html_block.get('class')
        ind = 1
        if len(block_class) == 1:
            ind = 0

        html_block.string = class_to_placeholder[html_block.get('class')[ind]]

        return 1
    else:
        for block in html_block.find_all(recursive = False):
            combine_text(block)
    return -1

def clean_raw_html(html: str) -> str:
    extracted_html = BeautifulSoup(html, "html.parser")

    # Prepare the cleaned HTML structure
    clean_html = BeautifulSoup("<html><head></head><body></body></html>", "html.parser")
    body = clean_html.body
    body.attrs = extracted_html.body.attrs

    # Find all <style> tags from the original
    style_tags = extracted_html.find_all('style')

    # Append them into the <head> of the new HTML
    new_head = clean_html.head
    for style_tag in style_tags:
        new_head.append(style_tag)


    # Loop through all page containers
    for outer in extracted_html.body.find_all("div", recursive=False):

      outer_div = clean_html.new_tag("div", **outer.attrs)

      for page in extracted_html.find_all("div", class_='page'):

          page_div = clean_html.new_tag("div", **page.attrs)

          for block in page.find_all(recursive=False):

              combine_text(block)
              page_div.append(block)

          outer_div.append(page_div)

      body.append(outer_div)

    return clean_html.prettify()


def clean_html(filename):

    try:
        with open(f"{filename}.html", "r", encoding="utf-8") as f:
            raw_html = f.read()
    except UnicodeDecodeError:
        with open(f"{filename}.html", "r", encoding="cp1252") as f:
            raw_html = f.read()

    cleaned_html= clean_raw_html(raw_html)

    cleaned_file = f"{filename}_cleaned"

    with open(f"{cleaned_file}.html", "w", encoding="utf-8") as f:
        f.write(cleaned_html)

    return(cleaned_file)

