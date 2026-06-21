from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"BROWSER ERROR: {exc}"))

    # Setup localStorage to bypass onboarding and cookies
    page.goto("http://localhost:5173")
    page.evaluate("window.localStorage.setItem('jajat_onboarding_completed', 'true')")
    page.evaluate("window.localStorage.setItem('jajat_cookie_consent_v1', '{\"essential\":true,\"analytics\":true,\"marketing\":true}')")
    page.evaluate("window.localStorage.setItem('currentPage', 'applications')")

    # Reload
    page.goto("http://localhost:5173/?page=applications")

    # Wait longer
    page.wait_for_timeout(10000)

    # Take screenshot
    page.screenshot(path="verification/screenshots/refactor_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        video_dir = os.path.join(os.getcwd(), "verification/videos")
        context = browser.new_context(
            record_video_dir=video_dir,
            viewport={'width': 1280, 'height': 720}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
