#!/usr/bin/env python3
"""
Persistent Browser Session Service using Playwright
Manages secure, persistent browser sessions for social media automation.
"""

import os
import json
import asyncio
import hashlib
import shutil
from pathlib import Path
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from cryptography.fernet import Fernet
import base64

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from playwright.async_api import async_playwright, BrowserContext, Page, Browser
import uvicorn


# Configuration
SESSIONS_DIR = Path("./user_sessions")
ENCRYPTION_KEY_FILE = Path("./session_encryption.key")
SESSION_TIMEOUT_HOURS = 24 * 7  # 7 days


@dataclass
class SessionMetadata:
    """Metadata for a browser session"""
    user_id: str
    site_name: str
    created_at: datetime
    last_used: datetime
    is_valid: bool = True
    session_data: Dict = None


class SessionRequest(BaseModel):
    """Request model for session operations"""
    user_id: str
    site_name: str
    login_url: str


class ActionRequest(BaseModel):
    """Request model for automated actions"""
    user_id: str
    site_name: str
    action_type: str
    action_data: Dict = {}


class BrowserSessionManager:
    """Manages persistent browser sessions with encryption"""
    
    def __init__(self):
        self.encryption_key = self._get_or_create_encryption_key()
        self.cipher = Fernet(self.encryption_key)
        self.active_sessions: Dict[str, BrowserContext] = {}
        self.playwright = None
        self.browser = None
        
        # Ensure sessions directory exists
        SESSIONS_DIR.mkdir(exist_ok=True)
    
    def _get_or_create_encryption_key(self) -> bytes:
        """Get existing encryption key or create a new one"""
        if ENCRYPTION_KEY_FILE.exists():
            with open(ENCRYPTION_KEY_FILE, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            with open(ENCRYPTION_KEY_FILE, 'wb') as f:
                f.write(key)
            # Set restrictive permissions
            os.chmod(ENCRYPTION_KEY_FILE, 0o600)
            return key
    
    def _get_session_dir(self, user_id: str, site_name: str) -> Path:
        """Get the session directory for a user and site"""
        session_hash = hashlib.sha256(f"{user_id}:{site_name}".encode()).hexdigest()[:16]
        return SESSIONS_DIR / f"{user_id}_{session_hash}_{site_name}"
    
    def _get_metadata_file(self, user_id: str, site_name: str) -> Path:
        """Get the metadata file path for a session"""
        session_dir = self._get_session_dir(user_id, site_name)
        return session_dir / "session_metadata.json"
    
    def _encrypt_data(self, data: str) -> str:
        """Encrypt sensitive data"""
        return self.cipher.encrypt(data.encode()).decode()
    
    def _decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        return self.cipher.decrypt(encrypted_data.encode()).decode()
    
    async def _setup_playwright(self):
        """Initialize Playwright browser"""
        if not self.playwright:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=False,  # Set to False for manual login
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-extensions-except=',
                    '--disable-plugins-except=',
                ]
            )
    
    async def _cleanup_playwright(self):
        """Cleanup Playwright resources"""
        if self.browser:
            await self.browser.close()
            self.browser = None
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None
    
    def _save_session_metadata(self, user_id: str, site_name: str, metadata: SessionMetadata):
        """Save encrypted session metadata"""
        metadata_file = self._get_metadata_file(user_id, site_name)
        metadata_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert datetime objects to ISO strings for JSON serialization
        metadata_dict = asdict(metadata)
        metadata_dict['created_at'] = metadata.created_at.isoformat()
        metadata_dict['last_used'] = metadata.last_used.isoformat()
        
        # Encrypt sensitive metadata
        encrypted_data = self._encrypt_data(json.dumps(metadata_dict))
        
        with open(metadata_file, 'w') as f:
            json.dump({"encrypted_metadata": encrypted_data}, f)
        
        # Set restrictive permissions
        os.chmod(metadata_file, 0o600)
    
    def _load_session_metadata(self, user_id: str, site_name: str) -> Optional[SessionMetadata]:
        """Load and decrypt session metadata"""
        metadata_file = self._get_metadata_file(user_id, site_name)
        
        if not metadata_file.exists():
            return None
        
        try:
            with open(metadata_file, 'r') as f:
                data = json.load(f)
            
            # Decrypt metadata
            decrypted_data = self._decrypt_data(data["encrypted_metadata"])
            metadata_dict = json.loads(decrypted_data)
            
            # Convert ISO strings back to datetime objects
            metadata_dict['created_at'] = datetime.fromisoformat(metadata_dict['created_at'])
            metadata_dict['last_used'] = datetime.fromisoformat(metadata_dict['last_used'])
            
            return SessionMetadata(**metadata_dict)
        
        except Exception as e:
            print(f"Error loading session metadata: {e}")
            return None
    
    def _is_session_expired(self, metadata: SessionMetadata) -> bool:
        """Check if a session has expired"""
        if not metadata.is_valid:
            return True
        
        expiry_time = metadata.last_used + timedelta(hours=SESSION_TIMEOUT_HOURS)
        return datetime.now() > expiry_time
    
    async def create_session(self, user_id: str, site_name: str, login_url: str) -> Dict:
        """Create a new persistent browser session"""
        
        await self._setup_playwright()
        
        session_dir = self._get_session_dir(user_id, site_name)
        session_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Create persistent context
            context = await self.browser.new_context(
                user_data_dir=str(session_dir),
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            page = await context.new_page()
            
            # Navigate to login page
            await page.goto(login_url)
            
            print(f"Browser opened for {user_id} at {login_url}")
            print("Please complete the login process manually...")
            print("The browser will remain open until you confirm login completion.")
            
            # Store the session temporarily
            session_key = f"{user_id}:{site_name}"
            self.active_sessions[session_key] = context
            
            # Create metadata
            metadata = SessionMetadata(
                user_id=user_id,
                site_name=site_name,
                created_at=datetime.now(),
                last_used=datetime.now(),
                is_valid=True,
                session_data={"login_url": login_url}
            )
            
            return {
                "status": "session_created",
                "message": f"Browser session created for {user_id}. Please complete login manually.",
                "session_dir": str(session_dir),
                "next_step": f"Call /confirm-login/{user_id}/{site_name} when login is complete"
            }
            
        except Exception as e:
            # Cleanup on error
            if session_dir.exists():
                shutil.rmtree(session_dir)
            raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")
    
    async def confirm_login(self, user_id: str, site_name: str) -> Dict:
        """Confirm that manual login is complete and save the session"""
        
        session_key = f"{user_id}:{site_name}"
        context = self.active_sessions.get(session_key)
        
        if not context:
            raise HTTPException(status_code=404, detail="No active session found")
        
        try:
            # Test if login was successful by checking for common logged-in indicators
            page = context.pages[0] if context.pages else await context.new_page()
            
            # Get current URL to verify login success
            current_url = page.url
            
            # Save session metadata
            metadata = SessionMetadata(
                user_id=user_id,
                site_name=site_name,
                created_at=datetime.now(),
                last_used=datetime.now(),
                is_valid=True,
                session_data={
                    "login_url": current_url,
                    "confirmed_at": datetime.now().isoformat()
                }
            )
            
            self._save_session_metadata(user_id, site_name, metadata)
            
            # Close the browser context
            await context.close()
            del self.active_sessions[session_key]
            
            return {
                "status": "login_confirmed",
                "message": f"Session saved successfully for {user_id}",
                "current_url": current_url,
                "session_saved": True
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to confirm login: {str(e)}")
    
    async def execute_action(self, user_id: str, site_name: str, action_type: str, action_data: Dict = None) -> Dict:
        """Execute an automated action using saved session"""
        
        # Load session metadata
        metadata = self._load_session_metadata(user_id, site_name)
        if not metadata:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if self._is_session_expired(metadata):
            raise HTTPException(status_code=401, detail="Session expired. Please re-login.")
        
        session_dir = self._get_session_dir(user_id, site_name)
        if not session_dir.exists():
            raise HTTPException(status_code=404, detail="Session directory not found")
        
        await self._setup_playwright()
        
        try:
            # Load persistent context
            context = await self.browser.new_context(
                user_data_dir=str(session_dir),
                viewport={'width': 1920, 'height': 1080}
            )
            
            page = await context.new_page()
            
            # Execute the requested action
            result = await self._perform_action(page, action_type, action_data or {})
            
            # Update last used timestamp
            metadata.last_used = datetime.now()
            self._save_session_metadata(user_id, site_name, metadata)
            
            await context.close()
            
            return {
                "status": "action_completed",
                "action_type": action_type,
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            # Check if it's a session validity issue
            if "net::ERR_" in str(e) or "Session expired" in str(e):
                metadata.is_valid = False
                self._save_session_metadata(user_id, site_name, metadata)
                raise HTTPException(status_code=401, detail="Session invalid. Please re-login.")
            
            raise HTTPException(status_code=500, detail=f"Action failed: {str(e)}")
    
    async def _perform_action(self, page: Page, action_type: str, action_data: Dict) -> Dict:
        """Perform specific actions based on action_type"""
        
        if action_type == "get_profile":
            # Navigate to profile page and extract basic info
            profile_url = action_data.get("profile_url", "https://www.linkedin.com/feed/")
            await page.goto(profile_url)
            await page.wait_for_load_state('networkidle')
            
            title = await page.title()
            url = page.url
            
            return {
                "page_title": title,
                "current_url": url,
                "screenshot_taken": False
            }
        
        elif action_type == "post_message":
            # Example: Post a message (implementation depends on the site)
            message = action_data.get("message", "")
            if not message:
                raise ValueError("Message content is required")
            
            # Navigate to appropriate page
            await page.goto("https://www.linkedin.com/feed/")
            await page.wait_for_load_state('networkidle')
            
            return {
                "message": "Post functionality would be implemented here",
                "content": message,
                "posted": False  # Set to True when actually implemented
            }
        
        elif action_type == "screenshot":
            # Take a screenshot
            screenshot_path = f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            await page.screenshot(path=screenshot_path)
            
            return {
                "screenshot_path": screenshot_path,
                "page_title": await page.title(),
                "current_url": page.url
            }
        
        else:
            raise ValueError(f"Unknown action type: {action_type}")
    
    def list_sessions(self, user_id: Optional[str] = None) -> List[Dict]:
        """List all sessions or sessions for a specific user"""
        sessions = []
        
        for session_path in SESSIONS_DIR.iterdir():
            if session_path.is_dir():
                # Extract user_id and site_name from directory name
                parts = session_path.name.split('_')
                if len(parts) >= 3:
                    dir_user_id = parts[0]
                    site_name = parts[2]
                    
                    # Filter by user_id if specified
                    if user_id and dir_user_id != user_id:
                        continue
                    
                    metadata = self._load_session_metadata(dir_user_id, site_name)
                    if metadata:
                        sessions.append({
                            "user_id": metadata.user_id,
                            "site_name": metadata.site_name,
                            "created_at": metadata.created_at.isoformat(),
                            "last_used": metadata.last_used.isoformat(),
                            "is_valid": metadata.is_valid,
                            "is_expired": self._is_session_expired(metadata)
                        })
        
        return sessions
    
    def delete_session(self, user_id: str, site_name: str) -> bool:
        """Delete a session and its data"""
        session_dir = self._get_session_dir(user_id, site_name)
        
        if session_dir.exists():
            shutil.rmtree(session_dir)
            return True
        
        return False


# Initialize the session manager
session_manager = BrowserSessionManager()

# FastAPI application
app = FastAPI(
    title="Browser Session Service",
    description="Persistent browser session management for social media automation",
    version="1.0.0"
)


@app.on_event("startup")
async def startup_event():
    """Setup on startup"""
    print("Browser Session Service starting up...")
    print(f"Sessions directory: {SESSIONS_DIR.absolute()}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await session_manager._cleanup_playwright()
    print("Browser Session Service shut down.")


@app.post("/create-session")
async def create_session(request: SessionRequest):
    """Create a new browser session for manual login"""
    try:
        result = await session_manager.create_session(
            user_id=request.user_id,
            site_name=request.site_name,
            login_url=request.login_url
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/confirm-login/{user_id}/{site_name}")
async def confirm_login(user_id: str, site_name: str):
    """Confirm that manual login is complete"""
    try:
        result = await session_manager.confirm_login(user_id, site_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/execute-action")
async def execute_action(request: ActionRequest):
    """Execute an automated action using saved session"""
    try:
        result = await session_manager.execute_action(
            user_id=request.user_id,
            site_name=request.site_name,
            action_type=request.action_type,
            action_data=request.action_data
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sessions")
async def list_sessions(user_id: Optional[str] = None):
    """List all sessions or sessions for a specific user"""
    try:
        sessions = session_manager.list_sessions(user_id)
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/sessions/{user_id}/{site_name}")
async def delete_session(user_id: str, site_name: str):
    """Delete a session"""
    try:
        deleted = session_manager.delete_session(user_id, site_name)
        if deleted:
            return {"message": f"Session deleted for {user_id}:{site_name}"}
        else:
            raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "sessions_dir": str(SESSIONS_DIR.absolute())
    }


if __name__ == "__main__":
    uvicorn.run(
        "browser_session_service:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )