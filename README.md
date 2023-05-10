# chatgpt-reviewer-github-action

GitHub action that provides a service for adding review comments to a pull request on GitHub. This service uses the GitHub REST API and the OpenAI API to generate suggestions for pull request changes.

### Getting Started

To use this github action, you will need to have a GitHub account and an OpenAI API key. Also you will need to configure a GitHub action workflow.

1. In a repository you want to run this action, create a file:
   ```
     .github/workflows/chatgpt-reviewer-github-action.yml
   ```
2. Visit https://platform.openai.com/account/api-keys to generate a new OpenAi Api key.
3. Add new secret with a name `OPENAI_API_KEY` in `https://github.com/{user}/{repository}/settings/secrets/actions`. As a value set generated OpenAi Api key from the step 2
4. Update `chatgpt-reviewer-github-action.yml` with:
   ```yml
   name: chatgpt-reviewer-github-action
   run-name: chatgpt-reviewer-github-action
   on: [pull_request]
   jobs:
    chatgpt-reviewer-github-action:
      runs-on: ubuntu-latest
      steps:
        - name: ChatGPT Review
          uses: magnificode-ltd/chatgpt-reviewer-github-action@v0.0.3
          env:
            GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
            OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
   ```

### About

This repository was created & is maintained by MagnifiCode. We provide software development services. Feel free to contact us on [magnificode.net](https://magnificode.net/)

[<img src="docs/images/logo.png" width="250" />](https://magnificode.net/)

### Dependencies

- @actions/github: A GitHub Actions toolkit for interacting with the GitHub REST API.
- openai: A library for interacting with the OpenAI API.
