# chatgpt-reviewer-github-action

GitHub action that provides a service for adding review comments to a pull request on GitHub. This service uses the GitHub REST API and the OpenAI API to generate suggestions for pull request changes.

### Before you start

By using this repository you acknowledge and approve of the fact that:

- Your code would be sent to OpenAI servers for generating code review suggestions.
- Authors of this github action have no responsibility whatsoever to the consequences of the above, and they would not be liable for anything that happens as a result of using this action.

---

### Getting Started

To use this github action, you will need to have a GitHub account and an OpenAI API key. Also you will need to configure a GitHub action workflow.

1. Visit https://platform.openai.com/account/api-keys to generate a new OpenAi Api key.
2. Add new key with a name `OPENAI_API_KEY` as described [here](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository). As a value set generated OpenAi Api key from the step 2
4. In a repository you want to run this action, create a file: `.github/workflows/chatgpt-reviewer-github-action.yml` with the next content:
   ```yml
   name: chatgpt-reviewer-github-action
   run-name: chatgpt-reviewer-github-action
   on: [pull_request]
   jobs:
     chatgpt-reviewer-github-action:
       runs-on: ubuntu-latest
       steps:
         - name: ChatGPT Review
           uses: magnificode-ltd/chatgpt-reviewer-github-action@v0.0.5
           with:
             model: gpt-3.5-turbo
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
             OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
   ```
---

### About

<a href="https://magnificode.net">
   <img src='docs/images/logo.png' alt='MagnifiCode'/>
</a>

This repository was created & is maintained by MagnifiCode. We provide web development services. We specialize in React/Node/AWS (etc) and are available for [hire](https://magnificode.net/contact). Learn more about us on [magnificode.net](https://magnificode.net/).

Follow us on [Twitter](https://twitter.com/magnificodehq) and [LinkedIn](https://www.linkedin.com/company/magnificode-software) for more updates.

---

### Known Issues

Currently we add comments for a specific patch on the first line of the patch, so you may see a suggestion a bit higher on the file than it should be.
In future versions we want to fix this. See our issues page for other issues.
If you found any issue that's not in the issues area, feel free to create one and submit PRs.

---

### Dependencies

- @actions/github: A GitHub Actions toolkit for interacting with the GitHub REST API.
- openai: A library for interacting with the OpenAI API.
