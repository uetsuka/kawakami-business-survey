# Kawakami Foods — Singapore Business Survey

English survey for Singapore buyers, restaurants, wholesalers and corporate partners.

Live website: https://uetsuka.github.io/kawakami-business-survey/

## Editing and publication

Questions: `lib/questions.ts`.
Survey text and layout: `app/survey.tsx`.
Main visual: `app/hero.tsx`.
Styles: `app/globals.css`, `app/survey.css`, `app/header.css`.

Install Node.js 22.13 or later, then run `npm install` and `npm run build`. Copy `github-pages/dist/index.html` to the repository root as `index.html` and commit it to `main`. GitHub Pages publishes from the root of `main`.

## Response storage

Responses are sent over HTTPS to https://kawakami-business-survey.chiekouetsuka.chatgpt.site/api/responses and saved in the existing private database. Images are served from the same site. Survey answers and contact details are never committed to this repository. Google Sheets synchronisation and email notification setup are still separate work.
