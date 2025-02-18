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
            return str(element) if element else ''
        
        # Handle footnotes
        if element.name == 'div' and 'footnote' in element.get('class', []):
            # Get footnote number from the anchor
            footnote_link = element.find('a', class_='footnote-number')
            if not footnote_link:
                return ''
            footnote_num = footnote_link.text.strip()
            
            # Get footnote content
            footnote_content = element.find('div', class_='footnote-content')
            if not footnote_content:
                return ''
            
            # Convert footnote content to markdown
            content = ''
            for child in footnote_content.children:
                content += html_to_markdown(child, images_dir)
            
            # Format as markdown footnote
            return f"\n[^{footnote_num}]: {content.strip()}\n"
        
        # Handle footnote references in text
        if element.name == 'a' and element.get('href', '').startswith('#footnote-'):
            footnote_num = element.text.strip()
            return f"[^{footnote_num}]"
        
        # Handle horizontal rules
        if element.name == 'hr':
            return "\n---\n"
        
        # Handle div containing hr
        if element.name == 'div':
            hr = element.find('hr')
            if hr and not element.find_parent('figure'):  # Avoid processing hr inside figures
                return "\n---\n"
        
        # Get all content
        content = ''
        try:
            for child in element.children:
                content += html_to_markdown(child, images_dir)
        except Exception as e:
            logging.debug(f"Error processing children of {element.name}: {str(e)}")
            content = element.get_text()
        
        # Handle various HTML elements
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
        elif element.name == 'figcaption':
            return f"\n&nbsp;&nbsp;&nbsp;&nbsp;_{content.strip()}_\n"
        elif element.name == 'h1':
            return f"\n# {content.strip()}\n"
        elif element.name == 'h2':
            return f"\n## {content.strip()}\n"
        elif element.name == 'h3':
            return f"\n### {content.strip()}\n"
        elif element.name == 'p':
            # Skip if inside a figcaption
            if element.find_parent('figcaption'):
                return content
            return f"\n{content.strip()}\n"
        elif element.name == 'strong' or element.name == 'b':
            return f"**{content.strip()}**"
        elif element.name == 'em' or element.name == 'i':
            return f"_{content.strip()}_"
        elif element.name == 'a':
            href = element.get('href', '')
            return f"[{content.strip()}]({href})"
        elif element.name == 'ul':
            return '\n' + ''.join(f"- {html_to_markdown(li, images_dir).strip()}\n" for li in element.find_all('li', recursive=False))
        elif element.name == 'ol':
            return '\n' + ''.join(f"{i+1}. {html_to_markdown(li, images_dir).strip()}\n" for i, li in enumerate(element.find_all('li', recursive=False)))
        elif element.name == 'blockquote':
            return f"\n> {content.strip()}\n"
        elif element.name == 'code':
            return f"`{content.strip()}`"
        elif element.name == 'pre':
            return f"\n```\n{content.strip()}\n```\n"
        
        return content
    except Exception as e:
        logging.error(f"Error converting HTML to markdown for element {getattr(element, 'name', 'unknown')}: {str(e)}")
        try:
            return element.get_text() if hasattr(element, 'get_text') else str(element)
        except:
            return ''

def extract_content_blocks(soup):
    """Extract content from Substack's block structure"""
    content = []
    processed_images = set()  # Track processed image URLs
    processed_hrs = set()  # Track processed horizontal rules
    footnotes = []  # Store footnotes to append at the end
    
    try:
        # Find the main article content
        article = soup.find('article')
        if not article:
            article = soup.find('div', class_='post-content')
        
        if not article:
            logging.error("Could not find article content")
            return []
        
        # First collect all footnotes
        for footnote in article.find_all('div', class_='footnote'):
            footnotes.append(footnote)
        
        # Look for content blocks within the article
        blocks = article.find_all(['h1', 'h2', 'h3', 'p', 'blockquote', 'ul', 'ol', 
                                 'div', 'figure', 'img', 'hr'])
        
        logging.info(f"Found {len(blocks)} potential content blocks")
        
        for block in blocks:
            # Skip navigation, header, footer, and post-content blocks
            if block.find_parent(class_=lambda x: x and any(term in str(x).lower() for term in 
                ['header', 'footer', 'nav', 'comment', 'subscribe', 'share', 'post-footer'])):
                continue
            
            # Skip empty blocks
            if not block.get_text(strip=True) and not block.find('img') and block.name != 'hr':
                continue
            
            # Skip '#Notes' header and everything after it
            if block.name == 'h1' and block.get_text(strip=True) == 'Notes':
                break  # Stop processing blocks after finding Notes section
            
            # Skip footnotes in main content
            if block.find_parent(class_='footnote') or 'footnote' in block.get('class', []):
                continue
            
            # Skip paragraphs that are inside list items or captions
            if block.name == 'p' and (block.find_parent('li') or 
                                    block.find_parent('figcaption') or 
                                    block.find_parent(class_='image-caption')):
                continue
            
            # Handle horizontal rule blocks
            if block.name == 'hr' or (block.name == 'div' and 'horizontalrule-block' in block.get('class', [])):
                hr = block if block.name == 'hr' else block.find('hr')
                if hr:
                    hr_str = str(hr)
                    if hr_str not in processed_hrs:
                        content.append(hr)
                        processed_hrs.add(hr_str)
                continue
            
            # Handle image blocks and their captions
            if block.name == 'figure' or (block.name == 'div' and 'image' in block.get('class', [])):
                img = block.find('img')
                if img and 'src' in img.attrs:
                    img_url = img['src']
                    if img_url not in processed_images:
                        content.append(img)
                        processed_images.add(img_url)
                        
                        # Find and add the caption
                        caption_wrapper = block.find('figcaption') or block.find('div', class_='image-caption')
                        if caption_wrapper:
                            content.append(caption_wrapper)
                continue
            
            # Handle standalone images
            if block.name == 'img' and 'src' in block.attrs:
                img_url = block['src']
                if img_url not in processed_images:
                    content.append(block)
                    processed_images.add(img_url)
                continue
            
            # Handle text blocks (skip if they're part of a caption)
            if block.name in ['h1', 'h2', 'h3', 'p', 'blockquote', 'ul', 'ol']:
                if not (block.find_parent('figcaption') or block.find_parent(class_='image-caption')):
                    content.append(block)
        
        # Add footnotes at the end
        if footnotes:
            # Add a horizontal rule before footnotes
            hr = soup.new_tag('hr')
            content.append(hr)
            content.extend(footnotes)
        
        logging.info(f"Extracted {len(content)} content blocks")
        return content
    except Exception as e:
        logging.error(f"Error extracting content blocks: {str(e)}")
        return []

def extract_url_slug(url):
    """Extract the slug from a Substack URL"""
    try:
        # Remove trailing slashes and split URL
        clean_url = url.rstrip('/')
        # Extract the last part of the URL path
        slug = clean_url.split('/')[-1]
        # Remove any query parameters
        slug = slug.split('?')[0]
        return slug
    except Exception as e:
        logging.error(f"Error extracting URL slug: {str(e)}")
        return None

def scrape_substack_post(url):
    """Scrape a Substack blog post and convert to markdown"""
    try:
        global base_url
        base_url = url
        
        # Extract URL slug first
        url_slug = extract_url_slug(url)
        if not url_slug:
            logging.error("Could not extract URL slug")
            return None
        
        # Add headers to mimic a browser request
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract title - try multiple methods for Substack's format
        title = None
        # First try the article header title
        header = soup.find('div', class_='post-header')
        if header:
            title_elem = header.find('h1')
            if title_elem:
                title = title_elem.text.strip()
        
        # If not found, try the main content title
        if not title:
            title_elem = soup.find('h1', class_='post-title')
            if title_elem:
                title = title_elem.text.strip()
        
        # If still not found, try meta tags
        if not title:
            meta_title = soup.find('meta', property='og:title')
            if meta_title:
                title = meta_title.get('content', '').strip()
        
        if not title:
            title = soup.find('title')
            if title:
                title = title.text.strip()
                # Remove "| Substack" or similar suffixes
                title = re.sub(r'\s*\|.*$', '', title)
        
        # Extract date - try multiple methods for Substack's format
        date_str = None
        
        # First try the visible date element which usually has the text format
        date_elem = soup.find(['time', 'span'], string=re.compile(r'[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}'))
        if date_elem:
            try:
                # Parse date in format "Jun 14, 2023"
                date_str = datetime.strptime(date_elem.text.strip(), '%b %d, %Y').strftime('%m-%d-%Y')
            except ValueError:
                logging.debug(f"Could not parse visible date: {date_elem.text}")
        
        # If that fails, try the meta publication date
        if not date_str:
            meta_date = soup.find('meta', property='article:published_time')
            if meta_date:
                try:
                    date_value = meta_date.get('content')
                    if date_value:
                        # Handle ISO format dates
                        if 'T' in date_value:
                            date_value = date_value.split('T')[0]
                        parsed_date = datetime.strptime(date_value, '%Y-%m-%d')
                        date_str = parsed_date.strftime('%m-%d-%Y')
                except ValueError as e:
                    logging.error(f"Error parsing meta date {date_value}: {str(e)}")
        
        # If still no date, try other date formats
        if not date_str:
            date_elem = soup.find('time')
            if date_elem:
                try:
                    date_value = date_elem.get('datetime') or date_elem.text
                    # Try various date formats
                    for fmt in ['%Y-%m-%d', '%B %d, %Y', '%b %d, %Y']:
                        try:
                            parsed_date = datetime.strptime(date_value.split('T')[0] if 'T' in date_value else date_value, fmt)
                            date_str = parsed_date.strftime('%m-%d-%Y')
                            break
                        except ValueError:
                            continue
                except Exception as e:
                    logging.error(f"Error parsing time element date: {str(e)}")
        
        # If all attempts fail, use current date
        if not date_str:
            logging.warning("Could not find or parse date, using current date")
            date_str = datetime.now().strftime('%m-%d-%Y')
        
        # Extract description/subtitle
        description = None
        # First try the subtitle class
        subtitle = soup.find('h3', class_='subtitle')
        if subtitle:
            description = subtitle.text.strip()
        
        # If not found, try meta description
        if not description:
            meta_desc = soup.find('meta', property='og:description')
            if meta_desc:
                description = meta_desc.get('content', '').strip()
        
        # Process images
        images_dir = os.path.join('public', 'images')
        hero_image = None
        
        # Look for hero image in multiple places
        hero_img = None
        # First try og:image
        meta_img = soup.find('meta', property='og:image')
        if meta_img:
            hero_img = meta_img.get('content')
        
        # If no og:image, try first article image
        if not hero_img:
            first_img = soup.find('article')
            if first_img:
                img_tag = first_img.find('img')
                if img_tag:
                    hero_img = img_tag.get('src')
        
        # Download hero image if found
        if hero_img:
            if not hero_img.startswith(('http://', 'https://')):
                hero_img = urljoin(url, hero_img)
            hero_image = download_image(hero_img, images_dir)
        
        # Extract content blocks
        content_blocks = extract_content_blocks(soup)
        
        # Convert blocks to markdown
        markdown_content = ''
        
        # Add title as header at the top
        markdown_content += f"# {title}\n\n"
        
        # Add the rest of the content blocks
        for block in content_blocks:
            markdown_content += html_to_markdown(block, images_dir)
        
        # Clean up markdown content
        markdown_content = re.sub(r'\n{3,}', '\n\n', markdown_content)
        markdown_content = markdown_content.strip()
        
        # Generate frontmatter
        frontmatter = {
            'title': title,
            'category': 'blog',
            'date': date_str,
            'stars': 3,  # Default value
            'tags': ['blog'],
            'description': description[:160] + '...' if description and len(description) > 160 else description
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
            'slug': url_slug,
            'content': markdown_file_content
        }
        
    except Exception as e:
        logging.error(f"Error scraping post: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Convert Substack blog post to markdown')
    parser.add_argument('url', help='URL of the Substack blog post')
    parser.add_argument('--debug', action='store_true', help='Print debug information')
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        print(f"Scraping URL: {args.url}")
    
    result = scrape_substack_post(args.url)
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