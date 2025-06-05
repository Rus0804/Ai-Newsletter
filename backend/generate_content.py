from bs4 import BeautifulSoup
from openai import OpenAI
import httpx
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")

def remove_images_and_styles(filename):
    try:
        with open(f'{filename}.html', "r", encoding="utf-8") as f:
            raw_html = f.read()
    except UnicodeDecodeError:
        with open(f'{filename}.html', "r", encoding="cp1252") as f:
            raw_html = f.read()

    template = BeautifulSoup(raw_html, "html.parser")
    img_srcs = []
    for image in template.body.find_all("img"):
        img_srcs.append(image.get('src'))
        image['src'] = ''

    all_styles = []

    for tag in template.body.find_all():
        all_styles.append(tag.get("style"))
    
    return template, img_srcs, all_styles

def build_prompt(
    topic: str,
    content: str = "",
    tone: str = "informative",
    ) -> str:
    prompt = f"""You are a professional newsletter writer. Write a compelling, well-structured internal company newsletter article based on the following input.
Tone: {tone}
Topic: {topic}
Source Material:
{content if content else "(No source material provided. Write based solely on the topic.)"}
Ensure the content is original, factually accurate, and engaging. Add examples or anecdotes if relevant. Avoid fluff. Focus on delivering value to employees reading the newsletter."""
    
    return prompt

def get_content(template, formalised_content):

    prompt = f"{formalised_content}\nReplace the template text with the newsletter ONLY REPLACE THE TEMPLATE STRINGS DO NOT ADD OR REMOVE STYLES OR TAGS " + str(template.body)

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=API_KEY,
        timeout = 60
    )

    try:
        llm_output = client.chat.completions.create(
            model="deepseek/deepseek-chat-v3-0324:free",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

    except httpx.HTTPStatusError as e:
        print("HTTP error:", e.response.status_code)
        print(e.response.text)  # See the raw response
    except Exception as e:
        print("Other error:", str(e))

    return llm_output.choices[0].message.content


def check_output(llm_output, num_tags):

    start = llm_output.find("<body")
    end = llm_output.find("</body>")

    if not (start > -1 and end > -1):
        print("Error: Body tag not found")
        return False

    output_template = BeautifulSoup(llm_output[start:end+7], "html.parser").body

    count = 0
    for tag in output_template.find_all():
        count += 1
    if num_tags != count:
        print(f"Error: Number of tags mismatch (actual = {num_tags}, llm-output = {count})")
        return False
    
    return True
    

def add_images_and_styles_with_content(template, llm_output, img_srcs, all_styles):

    start = llm_output.find('<body')
    end = llm_output.find('</body>') + len('</body>')

    new_body = BeautifulSoup(llm_output[start:end], "html.parser").body

    template.body.replace_with(new_body)

    count = 0
    for image in template.body.find_all("img"):
        image['src'] = img_srcs[count]
        count+=1

    count = 0
    for tag in template.body.find_all():
        tag_style = all_styles[count]

        if 'class' in tag.attrs:
            if 'page' not in tag['class']:
                print(tag.name)
                tag_style = all_styles[count]
                start = tag_style.find('height:')
                end = tag_style[start:].find(';') + start
                tag_style = tag_style.replace(tag_style[start:end], 'height: auto')
                
        tag['style'] = tag_style
        count+=1
    
    return template

# Save modified HTML to a new file
def write_output(template):
    with open("generated-html/output.html", "w", encoding="utf-8") as f:
        f.write(template.prettify())  # or template.prettify() for formatted output