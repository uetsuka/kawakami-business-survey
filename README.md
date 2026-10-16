# 川上食品｜LP・アンケート共有

シンガポール市場向けのLP・アンケートをまとめています。以下の公開ページはログインせずに閲覧できます。

## 制作物を見る

| 対象 | LP・製品紹介 | アンケート |
| --- | --- | --- |
| バイヤー・レストラン・卸・企業 | [法人向けLP・製品一覧](https://kawakami-b2b-wf-preview.chiekouetsuka.chatgpt.site/) | [法人向けアンケート](https://uetsuka.github.io/kawakami-business-survey/#survey) |
| 消費者：Family／家族の食卓 | [Family LP](https://kawakami-consumer-survey.chiekouetsuka.chatgpt.site/family) | [Family アンケート](https://kawakami-consumer-survey.chiekouetsuka.chatgpt.site/family#q-0) |
| 消費者：Everyday／日常の食体験 | [Everyday LP](https://kawakami-consumer-survey.chiekouetsuka.chatgpt.site/fresh) | [Everyday アンケート](https://kawakami-consumer-survey.chiekouetsuka.chatgpt.site/fresh#q-0) |
| 消費者：Craft／歴史と職人の技 | [Craft LP](https://kawakami-consumer-survey.chiekouetsuka.chatgpt.site/craft) | [Craft アンケート](https://kawakami-consumer-survey.chiekouetsuka.chatgpt.site/craft#q-0) |

法人向けは英語12問、消費者向けは英語14問です。消費者向け3案の質問は共通です。

## リポジトリ

- [法人向けアンケート（このリポジトリ）](https://github.com/uetsuka/kawakami-business-survey)
- [消費者向けLP・アンケート](https://github.com/uetsuka/kawakami-consumer-survey)

法人アンケート画面はGitHub Pagesで公開しています。製品紹介LPと消費者向けLPは、上記の公開サイトへリンクしています。

## 回答データについて

アンケート回答はサイトのデータベースに記録されます。

回答データ・回答者の連絡先・接続キーはこのリポジトリに含めません。

## 編集・公開手順

質問：`lib/questions.ts`。アンケート：`app/survey.tsx`。MV：`app/hero.tsx`。
スタイル：`app/globals.css`、`app/survey.css`、`app/header.css`。

Node.js 22.13以上で `npm install`、`npm run build` を実行し、`github-pages/dist/index.html` をルートの `index.html` にコピーしてmainへコミットします。GitHub Pagesはmainのルートから公開します。

回答保存と画像配信には既存のサイトサーバーを使用します。2026-10-16に3サイトのシート同期と管理者通知の送信を検証しました。構成・移管手順は [INTEGRATION.md](INTEGRATION.md) を参照してください。
