from bs4 import BeautifulSoup
from openai import OpenAI #type: ignore
import httpx
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY_2")

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

    headers = {
        # "Authorization": f"Bearer {API_KEY}",
        # "Content-Type": "application/json",
        "HTTP-Referer": "http://127.0.0.1:8000/"
    }


    try:
        llm_output = client.chat.completions.create(
            model="deepseek/deepseek-chat-v3-0324:free",
            extra_headers = headers,
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
                tag_style = all_styles[count]
                start = tag_style.find('height:')
                end = tag_style[start:].find(';') + start
                tag_style = tag_style.replace(tag_style[start:end], 'height: auto')
                
        tag['style'] = tag_style
        count+=1
    
    return template

def write_output(template):
    with open("generated-html/output.html", "w", encoding="utf-8") as f:
        f.write(template.prettify())

def clean_html_string(html_string):
    if html_string.startswith("```html"):
        html_string = html_string[7:]  # Remove ```html
    elif html_string.startswith("```"):
        html_string = html_string[3:]  # Remove ```

    if html_string.endswith("```"):
        html_string = html_string[:-3]  # Remove trailing ```
    
    return html_string.strip()

def isHTML(text):
    lower = text.lower()
    return "<style>" in lower and "</style>" in lower


def no_template_generation(user_prompt, topic, tone):
  
    file_path = "generated-html"

    pro_prompt = f"""You are an expert copywriter and HTML email designer. First, take the user's raw prompt that contains newsletter content (such as company information, announcements, goals, etc.) based on {topic} and rewrite it in a more {tone} tone. Maintain the original intent, meaning, and key points, but enhance clarity, tone, and grammar to match corporate or marketing communication standards. Do not remove any meaningful user-provided information—only reword it to sound better.
    User prompt is: {user_prompt} RETURN ONLY THE UPDATED PROMPT. DO NOT SAY ANYTHING ELSE. """

    client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=API_KEY,
            timeout = 60
    )

    headers = {
        "HTTP-Referer": "http://127.0.0.1:8000/"
    }

    polish_response = client.chat.completions.create(
        model="meta-llama/llama-3.3-8b-instruct:free",
        extra_headers = headers,
        messages=[
            {
                "role": "user",
                "content": pro_prompt
            }
        ]
    )

    polished_prompt = polish_response.choices[0].message.content 
    print("Polished prompt: ",polished_prompt)
    html_string = ""
    while(not isHTML(html_string)):
        generate_template=f"""Generate a visually appealing, responsive HTML newsletter layout approximately 790px wide and 1250px tall, using a professional
        design with clear structure and consistent spacing. Randomly choose one layout style from: hero-first, card-style, stacked-content, column-grid, 
        sidebar-left, or sidebar-right. Include the following: a company logo and name (top-left or centered), a navigation bar with 3–5 links, a hero section
        with heading, subtitle, and CTA button, alternating image-text blocks, a motivational quote or announcement, an optional sidebar (left, right, or 
        omitted), and a footer with social media icons and legal text. Use a randomly generated but cohesive color scheme and font pairing (serif/sans-serif) 
        to ensure visual appeal and contrast. Apply a single <style> tag at the top, no <html>, <head>, or <body> tags. Ensure layout is clean, well-aligned, 
        and compatible with the GrapesJS editor — avoid floating or overlapping elements. Use div-based layout (not table-based) and insert placeholder images
        from https://via.placeholder.com/. Do **not** use placeholder or filler text like “Lorem Ipsum”; leave text sections empty or insert meaningful user-
        provided content where relevant. Incorporate and display this user-provided content where appropriate: {polished_prompt}. Output only the clean HTML,
        with embedded CSS in a single <style> tag, no explanations or comments.

    """
        
        html_response = client.chat.completions.create(
        model="deepseek/deepseek-chat-v3-0324:free",
        messages=[
            {
            "role": "user",
            "content": generate_template
            }
        ]
        )

        if not os.path.exists(file_path): os.mkdir(file_path)
        html_string = html_response.choices[0].message.content
        html_string = clean_html_string(html_string)

    print(html_string)
    
    try:
        print(f"{file_path}/output.html")
        print(os.path.exists(f"{file_path}/output.html"))
        with open(f"{file_path}/output.html", "w", encoding="utf-8") as f:
            
            print(f.writable())
            print(f"{file_path}/output.html")
            print(os.path.exists(f"{file_path}/output.html"))
            f.write(html_string)

    except Exception as e:
        print(e)