import os
import json
from datetime import datetime
from pathlib import Path
import requests
from dateutil import parser
import frontmatter

def test_fetch_tweets(test_username):
    print(f"Testing tweet fetch for user: {test_username}")
    
    try:
        # For testing, we'll create a sample tweet entry
        test_dir = Path('test_tweets')
        test_dir.mkdir(exist_ok=True)
        print(f"\nCreated test directory: {test_dir}")
        
        # Create a test tweet file
        tweet_id = "1890028374892110027"  # Real tweet ID
        tweet_date = "2024-02-12"  # Set to actual tweet date
        tweet_url = f"https://twitter.com/{test_username}/status/{tweet_id}"
        
        # Test the Twitter embed endpoint
        oembed_url = f"https://publish.twitter.com/oembed?url={tweet_url}"
        response = requests.get(oembed_url)
        
        if response.status_code == 200:
            print("\nSuccessfully tested Twitter embed endpoint")
            print("Embed HTML preview:", response.json()['html'][:100])
        else:
            print("\nWarning: Twitter embed endpoint returned:", response.status_code)
            print("This might affect tweet embedding in your site")
        
        # Create a test file
        slug = f"{tweet_date}-{tweet_id}"
        file_path = test_dir / f"{slug}.md"
        
        post = frontmatter.Post(
            '',
            category='tweet',
            date=tweet_date,
            stars=2,
            tweetId=tweet_id,
            tweetUrl=tweet_url,
            description='',
            slug=slug,
            span=8
        )
        
        with open(file_path, 'wb') as f:
            frontmatter.dump(post, f)
        print(f"\nCreated test file: {file_path}")
        
        print("\nTest complete!")
        print("1. Verified directory creation")
        print("2. Tested Twitter embed endpoint")
        print("3. Created sample tweet file")
        print("\nNext steps:")
        print("1. Check the test_tweets directory for the generated file")
        print("2. Try viewing the tweet in your website")
        print("3. Adjust the span/stars values if needed")
        
    except Exception as e:
        print(f"Error during test: {str(e)}")

if __name__ == "__main__":
    TEST_USERNAME = "kaseyklimes"  # Your Twitter username
    test_fetch_tweets(TEST_USERNAME) 