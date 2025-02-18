#!/usr/bin/env python3

import os
import re
import time
from datetime import datetime
from pathlib import Path
import frontmatter
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def make_request_with_backoff(url, headers, params=None, max_retries=3, initial_wait=5):
    """Make a request with exponential backoff for rate limits"""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, params=params)
            
            # Print debug information about the response
            print(f"Response status code: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            
            # If successful, return response
            if response.status_code == 200:
                return response
            
            # Handle rate limiting
            if response.status_code == 429:
                # Try to get reset time from headers
                reset_time = int(response.headers.get('x-rate-limit-reset', 0))
                current_time = int(time.time())
                
                # Print rate limit information
                print(f"Rate limit headers: {response.headers.get('x-rate-limit-remaining', 'N/A')} requests remaining")
                print(f"Rate limit reset time: {reset_time}")
                print(f"Current time: {current_time}")
                
                # If we have a valid reset time, wait until then plus 1 second
                if reset_time > current_time:
                    wait_time = reset_time - current_time + 1
                else:
                    # Fallback to exponential backoff
                    wait_time = initial_wait * (2 ** attempt)
                
                print(f"Rate limited. Waiting {wait_time} seconds...")
                time.sleep(wait_time)
                continue
            
            # For other errors, print response content and use a shorter backoff
            print(f"Request failed with status {response.status_code}")
            print(f"Response content: {response.text}")
            time.sleep(initial_wait)
            continue
                
        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:  # Last attempt
                raise Exception(f"Failed after {max_retries} attempts: {str(e)}")
            time.sleep(initial_wait)
    
    raise Exception("Failed to get response after all retries")

def get_user_profile(bearer_token, username):
    headers = {
        'Authorization': f'Bearer {bearer_token}',
        'Content-Type': 'application/json'
    }
    
    user_url = f'https://api.twitter.com/2/users/by/username/{username}'
    params = {
        'user.fields': 'profile_image_url,name,username,description'
    }
    
    try:
        response = make_request_with_backoff(user_url, headers, params)
        return response.json()['data']
    except Exception as e:
        print(f"Error fetching user profile: {str(e)}")
        return None

def extract_tweet_id(tweet_url):
    """Extract tweet ID from a tweet URL"""
    # Match the last sequence of digits in the URL
    match = re.search(r'/status/(\d+)', tweet_url)
    if match:
        return match.group(1)
    raise ValueError("Could not extract tweet ID from URL")

def get_tweet_data(bearer_token, tweet_id):
    """Fetch data for a specific tweet"""
    headers = {
        'Authorization': f'Bearer {bearer_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        # Get tweet data
        tweets_url = f'https://api.twitter.com/2/tweets/{tweet_id}'
        params = {
            'tweet.fields': 'public_metrics,created_at,entities,attachments,referenced_tweets,text,author_id',
            'expansions': 'referenced_tweets.id,attachments.media_keys,referenced_tweets.id.author_id,author_id',
            'media.fields': 'url,preview_image_url,type',
            'user.fields': 'name,username,profile_image_url'
        }
        
        response = make_request_with_backoff(tweets_url, headers, params)
        data = response.json()
        
        if 'data' not in data:
            print("Tweet not found in response")
            return None
            
        tweet = data['data']
        
        # Get user profile
        user_data = None
        if 'includes' in data and 'users' in data['includes']:
            user_data = next((user for user in data['includes']['users'] if user['id'] == tweet['author_id']), None)
        
        # Create a media lookup dictionary
        media_lookup = {}
        if 'includes' in data and 'media' in data['includes']:
            for media in data['includes']['media']:
                media_lookup[media['media_key']] = media

        # Create a referenced tweets lookup dictionary
        referenced_tweets_lookup = {}
        users_lookup = {}
        if 'includes' in data:
            if 'tweets' in data['includes']:
                for ref_tweet in data['includes']['tweets']:
                    referenced_tweets_lookup[ref_tweet['id']] = ref_tweet
            if 'users' in data['includes']:
                for user in data['includes']['users']:
                    users_lookup[user['id']] = user
        
        # Get media URLs if any
        media_urls = []
        if 'attachments' in tweet and 'media_keys' in tweet['attachments']:
            for media_key in tweet['attachments']['media_keys']:
                if media_key in media_lookup:
                    media = media_lookup[media_key]
                    media_url = media.get('url') or media.get('preview_image_url')
                    if media_url:
                        media_urls.append({
                            'url': media_url,
                            'type': media['type']
                        })
        
        # Get quoted tweet if any
        quoted_tweet = None
        if 'referenced_tweets' in tweet:
            for ref in tweet['referenced_tweets']:
                if ref['type'] == 'quoted' and ref['id'] in referenced_tweets_lookup:
                    ref_tweet = referenced_tweets_lookup[ref['id']]
                    ref_author = users_lookup.get(ref_tweet.get('author_id'))
                    quoted_tweet = {
                        'id': ref_tweet['id'],
                        'text': ref_tweet['text'],
                        'author': ref_author and {
                            'name': ref_author['name'],
                            'username': ref_author['username'],
                            'profile_image_url': ref_author['profile_image_url']
                        }
                    }
        
        return {
            'id': tweet['id'],
            'url': f"https://twitter.com/{user_data['username']}/status/{tweet['id']}",
            'date': tweet['created_at'][:10],
            'likes': tweet['public_metrics']['like_count'],
            'text': tweet['text'],
            'media': media_urls,
            'quoted_tweet': quoted_tweet,
            'profile': {
                'name': user_data['name'],
                'username': user_data['username'],
                'profile_image_url': user_data['profile_image_url'],
                'description': user_data.get('description', '')
            }
        }
    
    except Exception as e:
        print(f"Error fetching tweet: {str(e)}")
        return None

def create_tweet_file(tweet):
    """Create markdown file for a tweet"""
    content_dir = Path('content/tweet')
    content_dir.mkdir(parents=True, exist_ok=True)
    
    # Convert date from YYYY-MM-DD to MM-DD-YYYY format
    original_date = tweet['date']
    try:
        date_obj = datetime.strptime(original_date, '%Y-%m-%d')
        formatted_date = date_obj.strftime('%m-%d-%Y')
    except Exception as e:
        print(f"Error formatting date {original_date}: {str(e)}")
        formatted_date = original_date  # Fallback to original date if parsing fails
    
    slug = f"{original_date}-{tweet['id']}"  # Keep original date format for slug
    file_path = content_dir / f"{slug}.md"
    
    # Skip if file already exists
    if file_path.exists():
        print(f"Tweet {tweet['id']} already exists, skipping...")
        return
    
    # Calculate stars based on likes
    likes = tweet['likes']
    stars = 1
    
    post = frontmatter.Post(
        '',
        category='tweet',
        date=formatted_date,  # Use the new MM-DD-YYYY format
        stars=stars,
        tweetId=tweet['id'],
        tweetUrl=tweet['url'],
        description=tweet['text'],
        slug=slug,
        span=8,
        media=tweet['media'],
        quoted_tweet=tweet['quoted_tweet'],
        profile={
            'name': tweet['profile']['name'],
            'username': tweet['profile']['username'],
            'profile_image_url': tweet['profile']['profile_image_url'],
            'description': tweet['profile']['description']
        },
        likes=likes
    )
    
    with open(file_path, 'wb') as f:
        frontmatter.dump(post, f)
    print(f"Created file for tweet {tweet['id']} with {likes} likes (stars: {stars})")

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Fetch and process a single tweet')
    parser.add_argument('tweet_url', help='URL of the tweet to process')
    args = parser.parse_args()
    
    bearer_token = os.getenv('TWITTER_BEARER_TOKEN')
    
    if not bearer_token:
        print("Error: TWITTER_BEARER_TOKEN environment variable is required")
        print("Make sure you have a .env file with this variable or it is set in your environment")
        return
    
    try:
        # Extract tweet ID from URL
        tweet_id = extract_tweet_id(args.tweet_url)
        print(f"Processing tweet ID: {tweet_id}")
        
        # Fetch and process tweet
        tweet_data = get_tweet_data(bearer_token, tweet_id)
        if tweet_data:
            create_tweet_file(tweet_data)
            print("\nTweet processing completed successfully")
        else:
            print("Failed to fetch tweet data")
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 