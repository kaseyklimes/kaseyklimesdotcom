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
        
        # Ensure unique filename by adding timestamp if file exists
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
        return f"/images/{filename}"  # Keep the reference as /images/ for Next.js
    except Exception as e:
        logging.error(f"Error downloading image {url}: {str(e)}")
        return None

def html_to_markdown(element, images_dir):
    """Convert HTML to Markdown"""
    try:
        # Handle text nodes (NavigableString)
        if not hasattr(element, 'name') or element.name is None:
            # For text nodes, just return the string content
            return str(element) if element else ''
        
        # Debug logging for element structure (only for actual elements)
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
                    return f"![{alt}]({local_path})"
                return ''
        
        # Handle horizontal rules
        if element.name == 'hr':
            return "\n---\n"
        
        # Get all content, including nested paragraphs for list items
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
        
        # Handle image captions - process after collecting all content to preserve links
        if element.name == 'figcaption' or (element.name == 'div' and 'image-caption' in element.get('class', [])):
            logging.debug(f"Found caption element: {element.name}")
            logging.debug(f"Caption content before processing: {content}")
            result = f"\n&nbsp;&nbsp;&nbsp;&nbsp;_{content.strip()}_\n"
            logging.debug(f"Caption result: {result}")
            return result
        
        # Handle em tags first to ensure proper italics
        if element.name == 'em' or element.name == 'i':
            return f"_{content.strip()}_"  # Remove leading/trailing spaces
        
        if element.name == 'h1':
            return f"\n# {content}\n"
        elif element.name == 'h2':
            return f"\n## {content}\n"
        elif element.name == 'h3':
            return f"\n### {content}\n"
        elif element.name == 'p':
            # Check if paragraph is inside a figcaption or list item
            parent_figcaption = element.find_parent('figcaption')
            parent_caption_div = element.find_parent('div', class_='image-caption')
            parent_li = element.find_parent('li')
            
            if parent_figcaption or parent_caption_div or parent_li:
                # If inside a caption or list item, just return the content
                return content
            else:
                # Debug logging for standalone paragraphs
                logging.debug(f"Processing paragraph with content: {content}")
                logging.debug(f"Parent elements: {[p.name for p in element.parents]}")
                return f"\n{content}\n"
        elif element.name == 'strong' or element.name == 'b':
            return f"**{content}**"
        elif element.name == 'a':
            href = element.get('href', '')
            return f"[{content}]({href})"
        elif element.name == 'ul':
            return '\n' + ''.join(f"- {html_to_markdown(li, images_dir)}\n" for li in element.find_all('li', recursive=False))
        elif element.name == 'ol':
            return '\n' + ''.join(f"{i+1}. {html_to_markdown(li, images_dir)}\n" for i, li in enumerate(element.find_all('li', recursive=False)))
        elif element.name == 'blockquote':
            return f"\n> {content}\n"
        elif element.name == 'code':
            return f"`{content}`"
        elif element.name == 'pre':
            return f"\n```\n{content}\n```\n"
        elif element.name == 'br':
            return " "  # Replace <br> with space instead of newline
        
        return content
    except Exception as e:
        logging.error(f"Error converting HTML to markdown for element {getattr(element, 'name', 'unknown')}: {str(e)}")
        # Try to return the text content if possible
        try:
            if hasattr(element, 'get_text'):
                return element.get_text()
            elif hasattr(element, 'string'):
                return str(element.string)
            else:
                return str(element)
        except:
            return ''

def extract_content_blocks(soup):
    """Extract content from Squarespace's block structure"""
    content = []
    processed_captions = set()  # Keep track of processed captions
    
    try:
        # Look for content blocks
        blocks = soup.find_all(['h1', 'h2', 'h3', 'p', 'blockquote', 'ul', 'ol', 
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
                
            # Skip empty blocks
            if not block.get_text(strip=True) and not block.find('img') and block.name != 'hr':
                logging.debug("Skipping empty block")
                continue
                
            # Skip '#Notes' header
            if block.name == 'h1' and block.get_text(strip=True) == 'Notes':
                logging.debug("Skipping '#Notes' header")
                continue
                
            # Skip paragraphs that are inside list items or captions
            if block.name == 'p' and (block.find_parent('li') or 
                                    block.find_parent('figcaption') or 
                                    block.find_parent(class_='image-caption')):
                logging.debug("Skipping paragraph inside list item or caption")
                continue
                
            # Handle horizontal rule blocks
            if block.name == 'hr' or (block.name == 'div' and 'horizontalrule-block' in block.get('class', [])):
                hr = block if block.name == 'hr' else block.find('hr')
                if hr:
                    content.append(hr)
                    logging.debug("Added horizontal rule block")
                continue
                
            # Handle image blocks and their captions
            if block.name == 'figure' or (block.name == 'div' and 'image' in block.get('class', [])):
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
                
            # Handle text blocks (skip if they're part of a caption)
            if block.name in ['h1', 'h2', 'h3', 'p', 'blockquote', 'ul', 'ol']:
                if not (block.find_parent('figcaption') or block.find_parent(class_='image-caption')):
                    content.append(block)
                    logging.debug(f"Added {block.name} block")
                else:
                    logging.debug(f"Skipping {block.name} block inside caption")
                
        logging.info(f"Extracted {len(content)} content blocks")
        return content
    except Exception as e:
        logging.error(f"Error extracting content blocks: {str(e)}")
        return []

def format_date(date_str):
    """Format date string to MM-DD-YYYY format for consistent sorting"""
    try:
        # If it's a date range (e.g., "2022-2024" or "2022-present")
        if '-' in date_str:
            # Check if it's a MM-DD-YYYY format
            if re.match(r'^\d{2}-\d{2}-\d{4}$', date_str):
                return date_str  # Already in correct format
            return date_str  # Keep other date ranges as is
            
        # If it's just a year
        if re.match(r'^\d{4}$', date_str):
            return date_str  # Keep year-only dates as is
            
        # Parse the date string to datetime
        try:
            # Try parsing as YYYY-MM-DD first
            parsed_date = datetime.strptime(date_str.split('T')[0], '%Y-%m-%d')
            return parsed_date.strftime('%m-%d-%Y')
        except ValueError:
            try:
                # If that fails, try parsing as MM-DD-YYYY
                parsed_date = datetime.strptime(date_str, '%m-%d-%Y')
                return date_str  # Already in correct format
            except ValueError:
                return date_str  # Return original if all parsing fails
    except Exception as e:
        logging.error(f"Error formatting date {date_str}: {str(e)}")
        return date_str

def scrape_squarespace_post(url):
    """Scrape a Squarespace blog post and convert to markdown"""
    try:
        global base_url
        base_url = url
        
        # Add headers to mimic a browser request
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract metadata - try multiple strategies for title
        title = None
        
        # Try to find title in article header first
        article = soup.find('article')
        if article:
            title = article.find('h1')
            
        # If not found, try to find title in main content area
        if not title:
            main_content = soup.find(['main', 'article', 'div'], class_=lambda x: x and ('content' in x.lower() or 'post' in x.lower()))
            if main_content:
                title = main_content.find('h1')
        
        # If still not found, try to extract from URL
        if not title:
            url_parts = url.rstrip('/').split('/')
            title_from_url = url_parts[-1].replace('-', ' ').title()
            title = title_from_url
        else:
            title = title.text.strip()
        
        # Try to find the date in the URL first (Squarespace often includes it there)
        date_str = None
        url_date_match = re.search(r'/(\d{4}/\d{1,2}/\d{1,2})/', url)
        if url_date_match:
            try:
                date_parts = url_date_match.group(1).split('/')
                # Format as MM-DD-YYYY
                date_str = f"{int(date_parts[1]):02d}-{int(date_parts[2]):02d}-{date_parts[0]}"
            except ValueError:
                logging.warning(f"Could not parse date from URL: {url_date_match.group(1)}")
                date_str = None
        
        # If no date in URL, try to find it in the HTML
        if not date_str:
            time_element = soup.find('time')
            if time_element and 'datetime' in time_element.attrs:
                try:
                    date_str = format_date(time_element['datetime'])
                except (ValueError, IndexError):
                    logging.warning(f"Could not parse date from time element: {time_element['datetime']}")
                    date_str = None
        
        # If still no date, use current date
        if not date_str:
            date_str = datetime.now().strftime('%m-%d-%Y')
            logging.warning(f"Using current date as fallback: {date_str}")

        # Format the date
        date_str = format_date(date_str)

        # Process images
        images_dir = os.path.join('public', 'images')  # Update images directory to be in public
        hero_image = None
        
        # Extract content blocks
        content_blocks = extract_content_blocks(soup)
        
        # Find the first image for hero image
        first_img = next((block for block in content_blocks if block.name == 'img'), None)
        if first_img and 'src' in first_img.attrs:
            img_url = first_img['src']
            if not img_url.startswith(('http://', 'https://')):
                img_url = urljoin(url, img_url)
            hero_image = download_image(img_url, images_dir)
        
        # Convert blocks to markdown
        markdown_content = ''
        for block in content_blocks:
            markdown_content += html_to_markdown(block, images_dir)
        
        # Clean up markdown content
        markdown_content = re.sub(r'\n{3,}', '\n\n', markdown_content)
        markdown_content = markdown_content.strip()
        
        # Extract description (first paragraph)
        description = ''
        first_p = next((block for block in content_blocks if block.name == 'p'), None)
        if first_p:
            description = first_p.text.strip()
            if len(description) > 160:
                description = description[:157] + '...'
        
        # Generate frontmatter
        frontmatter = {
            'title': title,
            'category': 'blog',
            'date': format_date(date_str),  # Ensure date is in MM-DD-YYYY format
            'stars': 1,  # Default value
            'tags': ['blog'],  # Default tags
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
        logging.error(f"Error scraping post: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Convert Squarespace blog post to markdown')
    parser.add_argument('url', help='URL of the Squarespace blog post')
    parser.add_argument('--debug', action='store_true', help='Print debug information')
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        print(f"Scraping URL: {args.url}")
    
    result = scrape_squarespace_post(args.url)
    if result:
        # Ensure blog directory exists
        blog_dir = os.path.join('content', 'blog')
        os.makedirs(blog_dir, exist_ok=True)
        
        # Save markdown file
        file_path = os.path.join(blog_dir, f"{result['slug']}.md")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(result['content'])
        print(f"Successfully created {file_path}")
        
        if args.debug:
            print("\nGenerated content preview:")
            print("=" * 40)
            print(result['content'][:500] + "...")
            print("=" * 40)
    else:
        print("Failed to scrape blog post")
        sys.exit(1)

if __name__ == '__main__':
    main() 