#!/usr/bin/env python3
"""
Example client code for Browser Session Service
Demonstrates how to use the service for onboarding and automation
"""

import asyncio
import aiohttp
import json
from typing import Dict, Optional


class BrowserSessionClient:
    """Client for interacting with the Browser Session Service"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
    
    async def create_session(self, user_id: str, site_name: str, login_url: str) -> Dict:
        """Start the onboarding process for a new site"""
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.base_url}/create-session", json={
                "user_id": user_id,
                "site_name": site_name,
                "login_url": login_url
            }) as response:
                return await response.json()
    
    async def confirm_login(self, user_id: str, site_name: str) -> Dict:
        """Confirm that manual login is complete"""
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.base_url}/confirm-login/{user_id}/{site_name}") as response:
                return await response.json()
    
    async def execute_action(self, user_id: str, site_name: str, action_type: str, action_data: Dict = None) -> Dict:
        """Execute an automated action using saved session"""
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.base_url}/execute-action", json={
                "user_id": user_id,
                "site_name": site_name,
                "action_type": action_type,
                "action_data": action_data or {}
            }) as response:
                return await response.json()
    
    async def list_sessions(self, user_id: Optional[str] = None) -> Dict:
        """List all sessions"""
        params = {"user_id": user_id} if user_id else {}
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/sessions", params=params) as response:
                return await response.json()
    
    async def delete_session(self, user_id: str, site_name: str) -> Dict:
        """Delete a session"""
        async with aiohttp.ClientSession() as session:
            async with session.delete(f"{self.base_url}/sessions/{user_id}/{site_name}") as response:
                return await response.json()


async def onboarding_example():
    """Example of how to onboard a user to LinkedIn"""
    client = BrowserSessionClient()
    
    user_id = "user123"
    site_name = "linkedin"
    login_url = "https://www.linkedin.com/login"
    
    print("=== Onboarding Process ===")
    
    # Step 1: Create session and open browser for manual login
    print(f"1. Creating session for {user_id} on {site_name}...")
    result = await client.create_session(user_id, site_name, login_url)
    print(f"   Result: {result['message']}")
    
    # Step 2: Wait for user to complete login manually
    input("2. Please complete the login in the browser, then press Enter to continue...")
    
    # Step 3: Confirm login completion
    print("3. Confirming login completion...")
    try:
        result = await client.confirm_login(user_id, site_name)
        print(f"   Result: {result['message']}")
        print(f"   Session saved: {result['session_saved']}")
    except Exception as e:
        print(f"   Error: {e}")
        return
    
    print("✅ Onboarding complete! Session is now saved and ready for automation.")


async def automation_example():
    """Example of how to use saved sessions for automation"""
    client = BrowserSessionClient()
    
    user_id = "user123"
    site_name = "linkedin"
    
    print("=== Automation Examples ===")
    
    # Example 1: Get profile information
    print("1. Getting profile information...")
    try:
        result = await client.execute_action(
            user_id=user_id,
            site_name=site_name,
            action_type="get_profile",
            action_data={"profile_url": "https://www.linkedin.com/feed/"}
        )
        print(f"   Page title: {result['result']['page_title']}")
        print(f"   Current URL: {result['result']['current_url']}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Example 2: Take a screenshot
    print("2. Taking screenshot...")
    try:
        result = await client.execute_action(
            user_id=user_id,
            site_name=site_name,
            action_type="screenshot"
        )
        print(f"   Screenshot saved: {result['result']['screenshot_path']}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Example 3: Post a message (implementation needed)
    print("3. Posting a message...")
    try:
        result = await client.execute_action(
            user_id=user_id,
            site_name=site_name,
            action_type="post_message",
            action_data={"message": "Hello from automation!"}
        )
        print(f"   Post result: {result['result']['message']}")
    except Exception as e:
        print(f"   Error: {e}")


async def list_sessions_example():
    """Example of how to list and manage sessions"""
    client = BrowserSessionClient()
    
    print("=== Session Management ===")
    
    # List all sessions
    print("Current sessions:")
    result = await client.list_sessions()
    sessions = result.get('sessions', [])
    
    if not sessions:
        print("   No sessions found.")
    else:
        for session in sessions:
            print(f"   - {session['user_id']}:{session['site_name']} "
                  f"(created: {session['created_at']}, "
                  f"valid: {session['is_valid']}, "
                  f"expired: {session['is_expired']})")


async def main():
    """Main function demonstrating the complete workflow"""
    print("Browser Session Service Client Example")
    print("====================================")
    
    while True:
        print("\nChoose an option:")
        print("1. Run onboarding process")
        print("2. Run automation examples")
        print("3. List sessions")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == "1":
            await onboarding_example()
        elif choice == "2":
            await automation_example()
        elif choice == "3":
            await list_sessions_example()
        elif choice == "4":
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Please try again.")


if __name__ == "__main__":
    # Install required packages: pip install aiohttp
    asyncio.run(main())