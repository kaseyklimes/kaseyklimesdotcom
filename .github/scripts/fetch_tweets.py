import os
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
import frontmatter
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def make_request_with_backoff(url, headers, params=None, max_retries=3, initial_wait=60):
    """Make a request with exponential backoff for rate limits"""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, params=params)
            
            # If successful, return response
            if response.status_code == 200:
                return response
            
            # Handle rate limiting
            if response.status_code == 429:
                wait_time = initial_wait * (2 ** attempt)  # Exponential backoff
                print(f"Rate limited. Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
                continue
                
            # Handle other errors
            response.raise_for_status()
            
        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:  # Last attempt
                raise Exception(f"Failed after {max_retries} attempts: {str(e)}")
            time.sleep(initial_wait * (2 ** attempt))
    
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

def get_tweet_data(bearer_token, username):
    tweets = []
    
    headers = {
        'Authorization': f'Bearer {bearer_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        # First get user profile
        print("Fetching user profile...")
        user_data = get_user_profile(bearer_token, username)
        if not user_data:
            raise Exception("Failed to get user profile")
        
        user_id = user_data['id']
        
        # Get user's tweets with expanded data
        print("Fetching tweets...")
        tweets_url = f'https://api.twitter.com/2/users/{user_id}/tweets'
        params = {
            'tweet.fields': 'public_metrics,created_at,entities,attachments,referenced_tweets,text,author_id',
            'expansions': 'referenced_tweets.id,attachments.media_keys,referenced_tweets.id.author_id',
            'media.fields': 'url,preview_image_url,type',
            'user.fields': 'name,username,profile_image_url',
            'max_results': 100  # Maximum allowed per request
        }
        
        response = make_request_with_backoff(tweets_url, headers, params)
        data = response.json()
        
        if 'data' not in data:
            print("No tweets found in response")
            return tweets
            
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
            
        print(f"Processing {len(data['data'])} tweets...")
        for tweet in data['data']:
            likes = tweet['public_metrics']['like_count']
            if likes >= 200:  # Only include tweets with 100+ likes
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
                
                tweets.append({
                    'id': tweet['id'],
                    'url': f"https://twitter.com/{username}/status/{tweet['id']}",
                    'date': tweet['created_at'][:10],
                    'likes': likes,
                    'text': tweet['text'],
                    'media': media_urls,
                    'quoted_tweet': quoted_tweet,
                    'profile': {
                        'name': user_data['name'],
                        'username': user_data['username'],
                        'profile_image_url': user_data['profile_image_url'],
                        'description': user_data['description']
                    }
                })
                print(f"Found popular tweet: {tweet['id']} with {likes} likes")
    
    except Exception as e:
        print(f"Error fetching tweets: {str(e)}")
    
    return tweets

def create_tweet_files(tweets, username):
    content_dir = Path('content/tweet')
    content_dir.mkdir(parents=True, exist_ok=True)
    
    for tweet in tweets:
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
            continue
        
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
            likes=likes  # Add the likes count to the frontmatter
        )
        
        with open(file_path, 'wb') as f:
            frontmatter.dump(post, f)
        print(f"Created file for tweet {tweet['id']} with {likes} likes (stars: {stars})")

def main():
    username = os.getenv('TWITTER_USERNAME')
    bearer_token = os.getenv('TWITTER_BEARER_TOKEN')
    
    if not username or not bearer_token:
        print("Error: TWITTER_USERNAME and TWITTER_BEARER_TOKEN environment variables are required")
        print("Make sure you have a .env file with these variables or they are set in your environment")
        return
    
    try:
        tweets = get_tweet_data(bearer_token, username)
        create_tweet_files(tweets, username)
        print(f"\nProcessed {len(tweets)} popular tweets")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 