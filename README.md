# chatgpt-reviewer-github-action

GitHub action that provides a service for adding review comments to a pull request on GitHub. This service uses the GitHub REST API and the OpenAI API to retrieve information and generate suggestions for review comments.

### Getting Started

To use this github action, you will need to have a GitHub account and an OpenAI API key. Also you will need to configure a GitHub action workflow.

1. In a repository you want to run this action, create a file:
   ```
     .github/workflows/chatgpt-reviewer-github-action.yml
   ```
2. Add configuration to this file:
   ```yml
   name: chatgpt-reviewer-github-action
   run-name: chatgpt-reviewer-github-action
   on:
     pull_request:
       types: [opened, synchronize]
   jobs:
     chatgpt-reviewer-github-action:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout repository
           uses: actions/checkout@v3
           with:
             repository: magnificode-ltd/chatgpt-reviewer-github-action
             ref: main
         - name: Install dependencies
           run: npm i
         - name: Build
           run: npm run start:build
         - name: Run action
           run: npm run start:chatgpt-reviewer-github-action
       env:
         GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
         OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
   ```

### Dependencies

- @actions/github: A GitHub Actions toolkit for interacting with the GitHub REST API.
- openai: A library for interacting with the OpenAI API.
