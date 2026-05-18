# Task: Interview Preparation AI

## Description
Integrate with LLMs (e.g., Gemini, OpenAI) to generate personalized interview preparation questions and tips based on the job description and the user's profile.

## Acceptance Criteria
- [ ] "Prep with AI" button on the Application details page.
- [ ] Generates at least 5 behavioral and 5 technical questions specific to the role.
- [ ] Provides "Star Method" tips for behavioral questions.
- [ ] Allows users to save AI-generated notes to the application record.
- [ ] Configurable AI provider in Settings (API Key management).

## Tests
- **Integration Tests**: Mock LLM API responses and verify the UI handles them correctly (loading states, error handling).
- **Unit Tests**: Verify the prompt engineering logic correctly incorporates job description and company info.
- **UI Tests**: Ensure the AI response is formatted correctly (Markdown support).
