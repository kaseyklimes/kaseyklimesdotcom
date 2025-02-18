#!/usr/bin/env python3

import os
import re
import sys
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from slugify import slugify
from urllib.parse import urljoin, urlparse
import argparse
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Global variables
base_url = None

def download_image(url, save_dir):
    """Download image and return local path"""
    try:
        logging.info(f"Downloading image from {url}")
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            logging.error(f"Failed to download image, status code: {response.status_code}")
            return None
        
        # Extract filename from URL and sanitize it
        filename = os.path.basename(urlparse(url).path)
        filename = re.sub(r'[^a-zA-Z0-9._-]', '', filename)
        
        # If filename is empty or invalid after sanitization, generate a random one
        if not filename or filename == '.':
            ext = os.path.splitext(url)[1] or '.jpg'
            filename = f"image-{datetime.now().strftime('%Y%m%d-%H%M%S')}{ext}"
        
        # Ensure unique filename
        base, ext = os.path.splitext(filename)
        counter = 1
        while os.path.exists(os.path.join(save_dir, filename)):
            filename = f"{base}-{counter}{ext}"
            counter += 1
        
        # Ensure the public/images directory exists
        os.makedirs(save_dir, exist_ok=True)
        
        # Save the image
        local_path = os.path.join(save_dir, filename)
        with open(local_path, 'wb') as f:
            f.write(response.content)
        
        logging.info(f"Successfully saved image to {local_path}")
        return f"/images/{filename}"
    except Exception as e:
        logging.error(f"Error downloading image {url}: {str(e)}")
        return None

def html_to_markdown(element, images_dir):
    """Convert HTML to Markdown with special handling for course content"""
    try:
        # Handle text nodes (NavigableString)
        if not hasattr(element, 'name') or element.name is None:
            # For text nodes, just return the string content
            return str(element) if element else ''
        
        # Debug logging for element structure
        logging.debug(f"\nProcessing element: {element.name}")
        logging.debug(f"Classes: {element.get('class', [])}")
        logging.debug(f"Full element HTML: {element}")

        # Handle images first
        if element.name == 'img':
            alt = element.get('alt', '')
            src = element.get('src', '')
            if src:
                if not src.startswith(('http://', 'https://')):
                    src = urljoin(base_url, src)
                logging.info(f"Processing image: {src}")
                local_path = download_image(src, images_dir)
                if local_path:
                    return f"\n![{alt}]({local_path})\n"
            return ''

        # Handle horizontal rule <hr>
        if element.name == 'hr':
            return "\n---\n"

        # Get all content
        content = ''
        try:
            for child in element.children:
                # For list items, include any nested paragraph content
                if element.name == 'li' and getattr(child, 'name', None) == 'p':
                    content += child.get_text()
                else:
                    content += html_to_markdown(child, images_dir)
        except Exception as e:
            logging.debug(f"Error processing children of {element.name}: {str(e)}")
            # Fallback to get_text() if processing children fails
            content = element.get_text()
        
        # Handle image captions
        if element.name == 'figcaption' or (element.name == 'div' and 'image-caption' in element.get('class', [])):
            logging.debug(f"Found caption element: {element.name}")
            logging.debug(f"Caption content before processing: {content}")
            result = f"\n*{content.strip()}*\n"
            logging.debug(f"Caption result: {result}")
            return result
        
        # Clean up content
        content = content.strip()
        
        # Handle block elements
        if element.name == 'h1':
            return f"\n# {content}\n"
        elif element.name == 'h2':
            return f"\n## {content}\n"
        elif element.name == 'h3':
            return f"\n### {content}\n"
        elif element.name == 'p':
            # Skip if it's inside a caption or list item
            if element.find_parent('figcaption') or element.find_parent('div', class_='image-caption') or element.find_parent('li'):
                return content
            return f"\n{content}\n" if content.strip() else ''
        elif element.name == 'strong' or element.name == 'b':
            return f"**{content}**" if content.strip() else ''
        elif element.name == 'em' or element.name == 'i':
            return f"_{content}_" if content.strip() else ''
        elif element.name == 'a':
            href = element.get('href', '')
            return f"[{content}]({href})" if content.strip() else ''
        elif element.name == 'ul':
            items = [f"* {html_to_markdown(li, images_dir).strip()}" for li in element.find_all('li', recursive=False)]
            return '\n' + '\n'.join(items) + '\n' if items else ''
        elif element.name == 'ol':
            items = [f"{i+1}. {html_to_markdown(li, images_dir).strip()}" for i, li in enumerate(element.find_all('li', recursive=False))]
            return '\n' + '\n'.join(items) + '\n' if items else ''
        elif element.name == 'blockquote':
            quote_content = content.strip()
            attribution = element.find(['cite', 'footer'])
            if attribution:
                return f"\n> {quote_content}\n>\n> — {attribution.get_text().strip()}\n"
            return f"\n> {quote_content}\n"
        elif element.name == 'code':
            return f"`{content}`" if content.strip() else ''
        elif element.name == 'pre':
            return f"\n```\n{content}\n```\n" if content.strip() else ''
        
        # For other elements, just return the content
        return content
    except Exception as e:
        logging.error(f"Error converting HTML to markdown: {str(e)}")
        return ''

def extract_course_content(soup):
    """Extract content specifically for course pages"""
    content = []
    processed_captions = set()  # Keep track of processed captions
    
    try:
        # First try to find Squarespace-specific content blocks
        main_content = soup.find('div', class_=lambda x: x and any(c in str(x).lower() for c in ['main-content', 'content-wrapper', 'page-content']))
        
        if not main_content:
            # Fallback to any div that contains the bulk of the content
            main_content = soup.find('div', class_=lambda x: x and len(str(x)) > 1000)
            if not main_content:
                main_content = soup
        
        logging.debug("\n=== Main Content HTML ===\n" + str(main_content.prettify()) + "\n=== End Main Content HTML ===\n")
        
        # Look for all content blocks including text and images
        blocks = main_content.find_all(['h1', 'h2', 'h3', 'p', 'blockquote', 'ul', 'ol', 
                                      'div', 'figure', 'img', 'hr'])
        
        logging.info(f"Found {len(blocks)} potential content blocks")
        
        for block in blocks:
            # Debug logging for block processing
            logging.debug(f"\nProcessing block: {block.name}")
            logging.debug(f"Block HTML: {block}")
            logging.debug(f"Block classes: {block.get('class', [])}")
            
            # Skip navigation, header, and footer blocks
            if block.find_parent(class_=lambda x: x and ('Header' in x or 'Footer' in x or 'Nav' in x)):
                logging.debug("Skipping header/footer/nav block")
                continue
            
            # Skip empty blocks (unless they're images or horizontal rules)
            if not block.get_text(strip=True) and not block.find('img') and block.name != 'hr':
                logging.debug("Skipping empty block")
                continue
            
            # Handle Squarespace-specific image blocks
            if block.name == 'div' and block.get('class'):
                classes = block.get('class', [])
                if any(c in str(classes).lower() for c in ['image-block', 'sqs-block-image', 'gallery-block']):
                    img = block.find('img')
                    if img and 'src' in img.attrs:
                        content.append(img)
                        logging.debug(f"Added image block: {img.get('src', '')}")
                        
                        # Find and add the caption
                        caption_wrapper = block.find('figcaption') or block.find('div', class_='image-caption')
                        if caption_wrapper:
                            caption_text = caption_wrapper.get_text(strip=True)
                            if caption_text and caption_text not in processed_captions:
                                content.append(caption_wrapper)
                                processed_captions.add(caption_text)
                                logging.debug(f"Added caption: {caption_text}")
                    continue
            
            # Handle standalone images
            if block.name == 'img' and 'src' in block.attrs:
                content.append(block)
                logging.debug(f"Added standalone image: {block.get('src', '')}")
                continue
            
            # Handle text blocks
            if block.name in ['h1', 'h2', 'h3', 'p', 'blockquote', 'ul', 'ol']:
                # Skip if it's part of a caption
                if not (block.find_parent('figcaption') or block.find_parent(class_='image-caption')):
                    content.append(block)
                    logging.debug(f"Added {block.name} block with text: {block.get_text(strip=True)[:100]}...")
            
            # Handle figures with images
            elif block.name == 'figure':
                img = block.find('img')
                if img and 'src' in img.attrs:
                    content.append(img)
                    logging.debug(f"Added figure image: {img.get('src', '')}")
                    
                    caption = block.find('figcaption')
                    if caption:
                        caption_text = caption.get_text(strip=True)
                        if caption_text and caption_text not in processed_captions:
                            content.append(caption)
                            processed_captions.add(caption_text)
                            logging.debug(f"Added figure caption: {caption_text}")
        
        logging.info(f"Extracted {len(content)} content blocks")
        return content
    except Exception as e:
        logging.error(f"Error extracting content blocks: {str(e)}")
        return []

def scrape_course_page(url):
    """Scrape a course page and convert to markdown"""
    try:
        global base_url
        base_url = url
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # Debug logging
        logging.debug(f"Response status code: {response.status_code}")
        logging.debug(f"Response content length: {len(response.text)}")
        logging.debug("\n=== Full HTML Content ===\n" + response.text + "\n=== End HTML Content ===\n")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract title
        title = None
        for title_elem in soup.find_all(['h1', 'title']):
            if title_elem.get_text(strip=True):
                title = title_elem.get_text(strip=True)
                break
        
        if not title:
            title = 'Design Research for Complex Systems'  # Fallback title
        
        # Extract description
        description = ''
        first_p = soup.find('p')
        if first_p:
            description = first_p.get_text(strip=True)
            if len(description) > 160:
                description = description[:157] + '...'
        
        # Process images
        images_dir = os.path.join('public', 'images')
        hero_image = None
        
        # Find hero image
        hero = soup.find('img', class_=lambda x: x and any(c in str(x).lower() for c in ['hero', 'banner', 'cover']))
        if not hero:
            hero = soup.find('img')
        
        if hero and 'src' in hero.attrs:
            img_url = hero['src']
            if not img_url.startswith(('http://', 'https://')):
                img_url = urljoin(url, img_url)
            hero_image = download_image(img_url, images_dir)
        
        # Extract content
        content_blocks = extract_course_content(soup)
        
        # Debug logging
        logging.debug(f"Found {len(content_blocks)} content blocks")
        
        # Convert to markdown
        markdown_content = ''
        for block in content_blocks:
            block_content = html_to_markdown(block, images_dir)
            if block_content:
                markdown_content += block_content
        
        # Clean up markdown
        markdown_content = re.sub(r'\n{3,}', '\n\n', markdown_content)
        markdown_content = markdown_content.strip()
        
        # Generate frontmatter
        frontmatter = {
            'title': title,
            'category': 'work',
            'date': '02-16-2025',  # Set a specific date for the course
            'stars': 3,
            'tags': ['teaching', 'course'],
            'description': description
        }
        
        if hero_image:
            frontmatter['heroImage'] = hero_image
        
        # Create markdown file content
        markdown_file_content = '---\n'
        for key, value in frontmatter.items():
            if isinstance(value, list):
                markdown_file_content += f'{key}: {json.dumps(value)}\n'
            elif isinstance(value, str) and ('\n' in value or ':' in value):
                markdown_file_content += f'{key}: "{value}"\n'
            else:
                markdown_file_content += f'{key}: {value}\n'
        markdown_file_content += '---\n\n'
        markdown_file_content += markdown_content
        
        return {
            'title': title,
            'slug': slugify(title),
            'content': markdown_file_content
        }
        
    except Exception as e:
        logging.error(f"Error scraping course page: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Convert complex web page to markdown')
    parser.add_argument('url', help='URL of the page to convert')
    parser.add_argument('--debug', action='store_true', help='Print debug information')
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    result = scrape_course_page(args.url)
    if result:
        # Ensure work directory exists
        work_dir = os.path.join('content', 'work')
        os.makedirs(work_dir, exist_ok=True)
        
        # Save markdown file
        file_path = os.path.join(work_dir, f"{result['slug']}.md")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(result['content'])
        print(f"Successfully created {file_path}")
        
        if args.debug:
            print("\nGenerated content preview:")
            print("=" * 40)
            print(result['content'][:500] + "...")
            print("=" * 40)
    else:
        print("Failed to scrape page")
        sys.exit(1)

if __name__ == '__main__':
    main() 