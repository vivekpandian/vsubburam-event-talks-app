import os
import re
import time
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 300  # 5 minutes cache

def clean_html_content(html_content):
    """
    Cleans up HTML content to make sure links open in a new tab 
    and styling matches our theme.
    """
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, "html.parser")
    for a in soup.find_all("a"):
        a["target"] = "_blank"
        a["rel"] = "noopener noreferrer"
        # Add a custom class for styling
        a["class"] = a.get("class", []) + ["note-link"]
    return str(soup)

def parse_release_notes(force_refresh=False):
    current_time = time.time()
    if not force_refresh and cache["data"] and (current_time - cache["last_fetched"] < CACHE_DURATION):
        return cache["data"], False

    try:
        # Fetch the feed
        feed_data = feedparser.parse(FEED_URL)
        
        # If feed parsing failed or entries are empty
        if not feed_data.entries:
            # Try fetching with requests first in case feedparser user-agent gets blocked
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(FEED_URL, headers=headers, timeout=10)
            feed_data = feedparser.parse(response.content)

        updates = []
        
        for entry in feed_data.entries:
            date_str = entry.title  # e.g., "June 15, 2026"
            entry_id = entry.id
            entry_link = entry.link
            
            # Use BeautifulSoup to split the summary by h3 tags
            summary_html = entry.summary
            soup = BeautifulSoup(summary_html, "html.parser")
            
            current_type = None
            current_content_nodes = []
            
            # Helper to save an update
            def save_update(type_name, content_nodes, index):
                if not type_name:
                    type_name = "Update"
                
                # Render content to HTML
                content_html = "".join(str(node) for node in content_nodes).strip()
                
                # Get clean plain text for searching/tweeting
                content_soup = BeautifulSoup(content_html, "html.parser")
                content_text = content_soup.get_text().strip()
                
                # Clean up multiple whitespaces/newlines
                content_text = re.sub(r'\s+', ' ', content_text)
                
                # Format type for CSS / display
                clean_type = type_name.strip()
                
                # Generate unique ID
                update_id = f"{entry_id}_{index}"
                
                # Clean HTML for frontend
                cleaned_html = clean_html_content(content_html)
                
                updates.append({
                    "id": update_id,
                    "date": date_str,
                    "type": clean_type,
                    "content_html": cleaned_html,
                    "content_text": content_text,
                    "link": entry_link
                })

            index = 0
            for child in soup.contents:
                if child.name == "h3":
                    # If we already have an ongoing type, save it first
                    if current_type or current_content_nodes:
                        save_update(current_type, current_content_nodes, index)
                        index += 1
                    current_type = child.get_text().strip()
                    current_content_nodes = []
                else:
                    # Only collect nodes if we have a type, or collect them as general update if there's no h3 yet
                    if current_type is not None or str(child).strip():
                        current_content_nodes.append(child)
            
            # Save the final one
            if current_type or current_content_nodes:
                save_update(current_type, current_content_nodes, index)

        # Update cache
        cache["data"] = updates
        cache["last_fetched"] = current_time
        return updates, True
    except Exception as e:
        print(f"Error fetching/parsing feed: {e}")
        # If there's an error but we have cached data, return cached data
        if cache["data"]:
            return cache["data"], False
        raise e

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/notes")
def get_notes():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    try:
        notes, refetched = parse_release_notes(force_refresh=force_refresh)
        return jsonify({
            "status": "success",
            "count": len(notes),
            "refetched": refetched,
            "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"])),
            "notes": notes
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
