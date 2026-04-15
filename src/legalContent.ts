/**
 * Bilingual legal copy for Sooner. Not a substitute for professional legal advice.
 *
 * Archiving: before you change terms or privacy text, add the previous body to `LEGAL_SNAPSHOTS`
 * in `legalArchive.ts` (see comment there), then edit this file and update `lastUpdated` in `legalMeta`.
 */

export type LegalSection = { id: string; title: string; paragraphs: string[] };

/** Bump when Terms or Privacy body changes; stored on user signup in Firestore `users`. */
export const LEGAL_DOCUMENT_VERSION_ID = "2026-04-15";

export const termsEn: LegalSection[] = [
  {
    id: "acceptance",
    title: "1. Agreement to these terms",
    paragraphs: [
      "By accessing or using Sooner (“Service”), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.",
      "We may update these terms from time to time. The “Last updated” date at the bottom will change when we do. Continued use after changes constitutes acceptance of the revised terms.",
    ],
  },
  {
    id: "description",
    title: "2. Description of the Service",
    paragraphs: [
      "Sooner is a browser-based development environment that may include AI-assisted code generation, editing, preview, project storage, authentication, and related features. Features may change during beta or as we improve the product.",
      "The Service is provided “as is.” We do not guarantee uninterrupted or error-free operation.",
    ],
  },
  {
    id: "accounts",
    title: "3. Accounts and eligibility",
    paragraphs: [
      "You may need to create an account (e.g. email, Google, or GitHub sign-in). You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.",
      "You must provide accurate information and be legally able to enter into this agreement in your jurisdiction.",
    ],
  },
  {
    id: "acceptable-use",
    title: "4. Acceptable use",
    paragraphs: [
      "You agree not to misuse the Service, including but not limited to: violating laws; infringing others’ rights; distributing malware; attempting unauthorized access to our systems or other users’ data; reverse engineering except where prohibited by law; scraping or overloading the Service; or using the Service to build competing services by systematically extracting our training patterns or proprietary flows.",
      "We may suspend or terminate access if we reasonably believe you have violated these terms or pose a risk to the Service or other users.",
    ],
  },
  {
    id: "ai",
    title: "5. AI-generated output",
    paragraphs: [
      "The Service may use third-party AI models (e.g. Google Gemini) to generate suggestions, code, or other content. Output may be incorrect, incomplete, or unsuitable for production. You are solely responsible for reviewing, testing, and using any AI-generated content.",
      "You must comply with the terms of any integrated third-party APIs or providers you connect (including API keys you supply).",
    ],
  },
  {
    id: "ip",
    title: "6. Your content and intellectual property",
    paragraphs: [
      "You retain ownership of your projects, code, and materials you submit to the Service, subject to the rights we need to operate the Service (e.g. hosting, processing, backup, and security).",
      "We retain all rights in the Sooner software, branding, documentation, and our proprietary systems. Except for the limited right to use the Service as offered, no rights are granted to you.",
    ],
  },
  {
    id: "third-party",
    title: "7. Third-party services",
    paragraphs: [
      "The Service relies on third parties such as Firebase (authentication and storage), hosting providers, and AI providers. Their services are subject to their own terms and privacy policies. We are not responsible for third-party services beyond what applicable law requires.",
    ],
  },
  {
    id: "beta",
    title: "8. Beta and changes",
    paragraphs: [
      "Sooner may be offered as a beta or preview. We may change, limit, or discontinue features with or without notice. We do not promise any minimum level of availability or support.",
    ],
  },
  {
    id: "disclaimer",
    title: "9. Disclaimers",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.",
    ],
  },
  {
    id: "liability",
    title: "10. Limitation of liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SOONER AND ITS AFFILIATES, OFFICERS, AND EMPLOYEES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, OR LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.",
      "OUR TOTAL LIABILITY FOR CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED US DOLLARS (USD $100), IF YOU HAVE NOT PAID ANYTHING.",
      "Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the fullest extent permitted by law.",
    ],
  },
  {
    id: "indemnity",
    title: "11. Indemnity",
    paragraphs: [
      "You will defend, indemnify, and hold harmless Sooner and its affiliates from claims, damages, losses, and expenses (including reasonable attorneys’ fees) arising from your use of the Service, your content, or your violation of these terms or applicable law.",
    ],
  },
  {
    id: "termination",
    title: "12. Termination",
    paragraphs: [
      "You may stop using the Service at any time. You may delete your account from the in-app Settings where available; deletion removes your authentication profile and associated cloud project storage we host, subject to the Privacy Policy.",
      "We may suspend or terminate your access if you breach these terms or if we discontinue the Service.",
      "Upon termination, provisions that by their nature should survive (e.g. disclaimers, limitations of liability, indemnity) will survive.",
    ],
  },
  {
    id: "law",
    title: "13. Governing law and disputes",
    paragraphs: [
      "These terms are governed by the laws of Japan, without regard to conflict-of-law principles, unless mandatory consumer protection laws in your country provide otherwise.",
      "Unless otherwise required by law, you agree that the courts of Japan shall have exclusive jurisdiction over disputes arising from these terms or the Service.",
    ],
  },
  {
    id: "contact",
    title: "14. Contact",
    paragraphs: [
      "For questions about these Terms, contact us at soonerutingna@gmail.com or through the channels published on https://lp.sooner.sh.",
    ],
  },
];

export const termsJa: LegalSection[] = [
  {
    id: "acceptance",
    title: "第1条（規約への同意）",
    paragraphs: [
      "本利用規約（以下「本規約」）は、Sooner（以下「本サービス」）の利用条件を定めるものです。本サービスを利用することにより、利用者は本規約に同意したものとみなされます。同意いただけない場合は、本サービスをご利用いただけません。",
      "当社は本規約を変更することがあります。変更後の本規約は、本ページに掲載した時点で効力を生じます。変更後に本サービスを継続して利用した場合、変更に同意したものとみなします。",
    ],
  },
  {
    id: "description",
    title: "第2条（サービスの内容）",
    paragraphs: [
      "本サービスは、ブラウザ上で動作する開発環境であり、AIによるコード生成・編集支援、プレビュー、プロジェクトの保存、認証その他の機能を提供します。ベータ版等として提供される場合があり、機能の追加・変更・中止が行われることがあります。",
      "本サービスは現状有姿で提供されます。当社は、本サービスが中断なく利用可能であること、または誤りがないことを保証するものではありません。",
    ],
  },
  {
    id: "accounts",
    title: "第3条（アカウント）",
    paragraphs: [
      "利用者は、メールアドレス、Google、GitHub等の方法でアカウントを作成する場合があります。認証情報の管理は利用者の責任とし、当該アカウントにおける一切の行為について利用者が責任を負います。",
      "利用者は、正確な情報を登録し、本規約を締結する法的権限を有することを表明し、保証します。",
    ],
  },
  {
    id: "acceptable-use",
    title: "第4条（禁止事項）",
    paragraphs: [
      "利用者は、以下の行為を行ってはなりません。法令違反、第三者の権利侵害、マルウェアの配布、当社または第三者のシステムへの不正アクセス、法令で認められる範囲を超えるリバースエンジニアリング、本サービスに過度な負荷を与える行為、本サービスを用いた当社の事業に不当に競合する行為その他、当社が不適切と判断する行為。",
      "当社は、利用者が本規約に違反した場合、または本サービス・他の利用者に悪影響を及ぼすおそれがあると判断した場合、アカウントの停止または利用の終了等の措置を講じることができます。",
    ],
  },
  {
    id: "ai",
    title: "第5条（AIによる生成物）",
    paragraphs: [
      "本サービスは、第三者のAIモデル（例：Google Gemini）を利用して、提案・コードその他のコンテンツを生成する場合があります。生成物には誤り、不完全性、または本番環境への不適合が含まれることがあります。生成物の確認、テスト、利用については利用者が自己の責任において行うものとします。",
      "利用者が連携する第三者API（利用者が設定するAPIキーを含む）の利用については、当該第三者の利用規約等に従うものとします。",
    ],
  },
  {
    id: "ip",
    title: "第6条（知的財産権）",
    paragraphs: [
      "利用者が本サービスにアップロードまたは作成したプロジェクト・コード等の著作権その他の権利は、利用者に帰属します。ただし、本サービスの提供・運用・セキュリティ確保に必要な範囲で、当社が当該データを処理・保存等することに、利用者は非独占的な許諾を与えます。",
      "本サービスに関するソフトウェア、名称、ロゴ、ドキュメント等に関する権利は当社に帰属します。本規約に基づく利用権以外の権利は付与されません。",
    ],
  },
  {
    id: "third-party",
    title: "第7条（第三者サービス）",
    paragraphs: [
      "本サービスは、Firebase（認証・ストレージ等）、ホスティング事業者、AIプロバイダー等の第三者サービスを利用します。これらは各提供者の利用規約およびプライバシーポリシーが適用されます。当社は、第三者サービスの内容について責任を負いません（法令上責任を負う場合を除きます）。",
    ],
  },
  {
    id: "beta",
    title: "第8条（ベータ版等）",
    paragraphs: [
      "本サービスはベータ版またはプレビューとして提供される場合があります。当社は、事前の通知なく機能の変更・制限・終了を行うことがあります。最低限の可用性やサポートについて保証するものではありません。",
    ],
  },
  {
    id: "disclaimer",
    title: "第9条（免責事項）",
    paragraphs: [
      "本サービスは、適用法令の定めにより認められる最大限の範囲において、明示・黙示を問わず、商品性、特定目的への適合性、非侵害性等について一切の保証をしません。",
    ],
  },
  {
    id: "liability",
    title: "第10条（責任制限）",
    paragraphs: [
      "適用法令の定めにより認められる最大限の範囲において、当社は、本サービスの利用に関連して生じた間接損害、付随損害、特別損害、結果的損害、逸失利益、データの喪失等について責任を負いません。",
      "当社が負う損害賠償責任の総額は、当該請求の原因となった事象が発生した日から遡って12か月間に利用者が当社に支払った利用料の合計額を上限とします。無償利用の場合は、日本円1万円を上限とします。",
      "消費者契約法その他の強行法規により上記の制限が無効となる場合は、当該法令の範囲内で責任を負います。",
    ],
  },
  {
    id: "indemnity",
    title: "第11条（利用者の賠償）",
    paragraphs: [
      "利用者は、自己の本サービスの利用、自己のデータ、または本規約・法令違反に起因して当社に対し請求がなされた場合、自己の費用と責任でこれを防御し、当社に生じた損害（合理的な弁護士費用を含む）を賠償します。",
    ],
  },
  {
    id: "termination",
    title: "第12条（利用停止等）",
    paragraphs: [
      "利用者は、いつでも本サービスの利用を終了できます。アプリの設定画面からアカウントを削除できる場合があります。削除により、当社がホストする認証プロファイルおよび関連するクラウド上のプロジェクトデータが削除されます（詳細はプライバシーポリシーに従います）。",
      "当社は、本規約違反がある場合、または事業上の理由により、本サービスの全部または一部を終了し、または利用者のアクセスを停止することがあります。",
      "終了後も、性質上存続すべき条項（免責、責任制限、賠償等）は有効に存続します。",
    ],
  },
  {
    id: "law",
    title: "第13条（準拠法・管轄）",
    paragraphs: [
      "本規約は日本法に準拠し、解釈されます。利用者の居住国の強行法規により別段の定めがある場合は、当該定めに従います。",
      "本規約または本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。ただし、消費者契約法その他により別段の管轄が定められる場合はその限りではありません。",
    ],
  },
  {
    id: "contact",
    title: "第14条（お問い合わせ）",
    paragraphs: [
      "本規約に関するお問い合わせは、soonerutingna@gmail.com または https://lp.sooner.sh に掲載する連絡方法にて受け付けます。",
    ],
  },
];

export const privacyEn: LegalSection[] = [
  {
    id: "intro",
    title: "1. Introduction",
    paragraphs: [
      "This Privacy Policy explains how Sooner (“we”, “us”) collects, uses, and shares information when you use our websites and services (collectively, the “Service”), including sooner.sh (sign-in and sign-up are only at https://sooner.sh/signin and https://sooner.sh/signup; we do not operate separate sign-in or sign-up hostnames for authentication, and any previously used have been removed from our hosting and auth configuration), lp.sooner.sh (marketing landing page), blog.sooner.sh (public blog and aggregated article view counts), cms.sooner.sh (admin content tools), and other subdomains we operate for the Service.",
      "By using the Service, you agree to this policy. If you do not agree, please do not use the Service.",
    ],
  },
  {
    id: "cookies-local-storage",
    title: "2. Cookies, local storage, and your choices",
    paragraphs: [
      "Sooner runs primarily in your browser. We use local storage to remember choices such as UI language, whether you responded to our storage notice, and—if you use the in-app editor—API keys or model settings you choose to save locally. Those values stay on your device unless you use features that send requests to AI or other APIs you configure.",
      "If you accept on the storage notice, we may set a first-party cookie (sooner_lang) scoped to .sooner.sh so your language preference can apply across our subdomains (for example lp.sooner.sh and sooner.sh). If you decline, we do not set that cookie and rely on per-hostname storage only, so language may not carry over when you move between subdomains.",
      "We record Accept or Decline in local storage so we do not show the notice on every visit. Clearing site data for our domains may reset this and show the notice again.",
      "We do not sell your personal information. This processing is for operating the Service and honoring your preferences.",
      "Hosting and optional gateways: If we deploy the Service on Vercel or similar infrastructure, those providers may process request metadata (such as IP address and timestamps) under their own privacy policies. The Sooner client does not embed a separate analytics product branded “Vercel Logs.” If you optionally choose “Vercel AI Gateway” (or similar) in Settings and send API traffic through it, that traffic is handled under Vercel’s terms as the gateway operator.",
    ],
  },
  {
    id: "collect",
    title: "3. Information we collect",
    paragraphs: [
      "Account data: email address, display identifiers, and authentication data when you sign in or create an account with email, Google, or GitHub at https://sooner.sh/signin or https://sooner.sh/signup.",
      "Project and usage data: files, code, chat messages, and settings you store or generate in the Service.",
      "Technical data: IP address, device/browser type, approximate location derived from IP, timestamps, and diagnostic logs needed to operate and secure the Service.",
      "Blog: when you read public blog pages, we may record aggregated page-view counts associated with articles.",
    ],
  },
  {
    id: "use",
    title: "4. How we use information",
    paragraphs: [
      "To provide, maintain, and improve the Service (including AI features when enabled).",
      "To authenticate you, sync projects, prevent fraud and abuse, and comply with legal obligations.",
      "To communicate with you about the Service (e.g. security notices) where permitted.",
      "To analyze usage in aggregate to improve performance and user experience.",
      "For public blog posts, we may use Google’s URL Inspection / Indexing API (with a service account you configure on our backend) to request faster discovery of new or updated article URLs. This does not grant Google access to non-public data.",
    ],
  },
  {
    id: "legal-basis",
    title: "5. Legal bases (EEA/UK users)",
    paragraphs: [
      "Where GDPR applies, we rely on: performance of a contract (providing the Service); legitimate interests (security, improvement, analytics in aggregate); consent where required (for example the optional cross-subdomain language cookie when you click Accept, or marketing if offered); and legal obligation where applicable.",
    ],
  },
  {
    id: "sharing",
    title: "6. Sharing and processors",
    paragraphs: [
      "We use service providers to host and operate the Service, including Google Firebase (authentication, Firestore, Storage), Google Cloud / AI (Gemini when you use AI features), and infrastructure providers. They process data on our instructions and under their own terms and policies.",
      "We may disclose information if required by law, to protect rights and safety, or in connection with a merger or asset sale (with notice where required).",
    ],
  },
  {
    id: "retention",
    title: "7. Retention",
    paragraphs: [
      "We retain information as long as your account is active and as needed to provide the Service, comply with law, resolve disputes, and enforce agreements. You may delete your stored projects from the IDE and may delete your account from Settings (Account) where available; this removes your Firebase Authentication account and attempts to remove associated project files in our storage. Some records may be retained for a limited period for backups and legal compliance.",
    ],
  },
  {
    id: "security",
    title: "8. Security",
    paragraphs: [
      "We implement reasonable technical and organizational measures to protect your information. No method of transmission or storage is 100% secure.",
    ],
  },
  {
    id: "rights",
    title: "9. Your rights",
    paragraphs: [
      "Depending on your location, you may have rights to access, correct, delete, or export your personal data, and to object to or restrict certain processing. You can request account deletion in the app (Settings) or by emailing soonerutingna@gmail.com. You may also lodge a complaint with your local data protection authority.",
    ],
  },
  {
    id: "children",
    title: "10. Children",
    paragraphs: [
      "The Service is not directed to children under 16 (or the age required in your jurisdiction). We do not knowingly collect personal information from children.",
    ],
  },
  {
    id: "transfers",
    title: "11. International transfers",
    paragraphs: [
      "We may process data in Japan, the United States, the European Economic Area, and other regions where our providers operate. Where required, we use appropriate safeguards (such as standard contractual clauses).",
    ],
  },
  {
    id: "changes",
    title: "12. Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. We will post the updated version on this page and update the “Last updated” date. Prior versions are listed at /legal/en/archive (and /legal/ja/archive) when archived.",
    ],
  },
  {
    id: "contact",
    title: "13. Contact",
    paragraphs: [
      "For privacy questions, contact us at soonerutingna@gmail.com or through the channels published on https://lp.sooner.sh.",
    ],
  },
];

export const privacyJa: LegalSection[] = [
  {
    id: "intro",
    title: "第1条（はじめに）",
    paragraphs: [
      "本プライバシーポリシー（以下「本ポリシー」）は、Sooner（以下「当社」）が提供するウェブサイトおよびサービス（以下「本サービス」）において、利用者の情報をどのように取り扱うかを説明するものです。対象には sooner.sh（サインインおよび新規登録は https://sooner.sh/signin および https://sooner.sh/signup のみ。認証専用の別ホスト名は運用しておらず、過去に用いたものは廃止し、Firebase Authentication・ホスティング等の設定からも除外済みです）、lp.sooner.sh（マーケティング用ランディングページ）、blog.sooner.sh（公開ブログおよび記事ごとの閲覧回数の集計）、cms.sooner.sh（管理用CMS）、その他本サービス運用のため当社が運用するサブドメインが含まれます。",
      "本サービスを利用することにより、本ポリシーに同意したものとみなされます。同意いただけない場合は、本サービスをご利用いただけません。",
    ],
  },
  {
    id: "cookies-local-storage",
    title: "第2条（Cookie・ローカルストレージと選択）",
    paragraphs: [
      "Sooner は主にブラウザ上で動作します。表示言語、本通知への対応の記録、およびエディタ利用時に端末へ保存する API キーやモデル設定など、利用者の選択をローカルストレージに保存する場合があります。利用者が設定した AI 等の API を呼び出す機能を使うまで、当社がそれらの値を取得することはありません。",
      "ストレージに関する通知で「同意する」を選んだ場合、.sooner.sh ドメインにスコープされたファーストパーティ Cookie（sooner_lang）を設定し、サブドメイン間（例：lp.sooner.sh と sooner.sh）で言語設定を揃えやすくすることがあります。「拒否する」を選んだ場合は当該 Cookie を設定せず、ホスト名ごとの保存にとどめるため、サイトをまたいだときに言語等が引き継がれないことがあります。",
      "同意または拒否の記録は繰り返し通知を表示しないためローカルストレージに保存します。当社ドメインのサイトデータを消去するとリセットされ、通知が再表示される場合があります。",
      "当社は、利用者の個人情報を販売しません。本処理は本サービスの運用および利用者の選択の尊重のために行います。",
      "ホスティングおよび任意のゲートウェイ：本サービスを Vercel 等のインフラ上にデプロイする場合、当該事業者がリクエストに関するメタデータ（IP アドレス、タイムスタンプ等）を各事業者のプライバシーポリシーに従い処理することがあります。Sooner のクライアントに、分析製品としての「Vercel Logs」を別途埋め込んでいるわけではありません。設定画面で「Vercel AI Gateway」等を任意に選択し、当該経路で API 通信を行う場合、その通信はゲートウェイ事業者（例：Vercel）の条項の下で処理されます。",
    ],
  },
  {
    id: "collect",
    title: "第3条（取得する情報）",
    paragraphs: [
      "アカウント情報：メールアドレス、表示名等の識別子、https://sooner.sh/signin および https://sooner.sh/signup において、メール・Google・GitHub等でサインイン・新規登録を行う際の認証に関する情報。",
      "利用・コンテンツ情報：本サービス上で保存または生成されるファイル、コード、チャット内容、設定等。",
      "技術情報：IPアドレス、端末・ブラウザの種類、IPアドレスから推定されるおおよその地域、タイムスタンプ、運用・セキュリティに必要なログ。",
      "ブログ：公開記事を閲覧した際に、記事単位の閲覧回数等を集計する場合があります。",
    ],
  },
  {
    id: "use",
    title: "第4条（利用目的）",
    paragraphs: [
      "本サービスの提供・維持・改善（AI機能を含む）。",
      "認証、プロジェクトの同期、不正利用の防止、法令に基づく対応。",
      "セキュリティ上重要な通知等、必要に応じた連絡。",
      "集計された形での利用状況の分析（パフォーマンスおよび体験の向上のため）。",
      "公開ブログ記事については、バックエンドに設定したサービスアカウント等を用い、Google の Indexing API（URL 通知）により新規・更新記事URLのクロール促進を行う場合があります。非公開データへのアクセスを Google に与えるものではありません。",
    ],
  },
  {
    id: "legal-basis",
    title: "第5条（法的根拠：EEA/英国の利用者）",
    paragraphs: [
      "GDPR等が適用される場合、当社は契約の履行、正当な利益（セキュリティ、改善、集計分析等）、同意が必要な処理に対する同意（例：通知で「同意する」を選んだ場合のサブドメイン間言語用 Cookie）、法令上の義務に基づき処理を行います。",
    ],
  },
  {
    id: "sharing",
    title: "第6条（第三者提供・委託）",
    paragraphs: [
      "当社は、本サービスのホスティングおよび運用のため、Google Firebase（認証、Firestore、Storage等）、Google Cloud / AI（Gemini等）、その他インフラ事業者に情報の処理を委託する場合があります。これらの事業者は、各事業者の利用規約およびプライバシーポリシーに従います。",
      "法令に基づく要請、権利・安全の保護、合併・事業譲渡等に伴い、必要な範囲で情報を開示する場合があります（法令上必要な場合は通知等を行います）。",
    ],
  },
  {
    id: "retention",
    title: "第7条（保存期間）",
    paragraphs: [
      "当社は、アカウントが有効な期間、および本サービスの提供、法令遵守、紛争解決、契約の執行に必要な期間、情報を保持します。IDE上で保存したプロジェクトの削除、および設定画面からのアカウント削除（Firebase Authentication アカウントの削除とストレージ上のプロジェクトファイルの削除を試みます）が可能です。バックアップや法令遵守のため、一定期間保持される場合があります。",
    ],
  },
  {
    id: "security",
    title: "第8条（セキュリティ）",
    paragraphs: [
      "当社は、情報を保護するために合理的な技術的・組織的安全管理措置を講じます。ただし、インターネット上の送信および電子的保存は完全に安全ではありません。",
    ],
  },
  {
    id: "rights",
    title: "第9条（利用者の権利）",
    paragraphs: [
      "お住まいの地域の法令に従い、保有個人データの開示、訂正、削除、利用停止、データポータビリティ等を請求できる場合があります。アプリの設定からアカウント削除を行うか、soonerutingna@gmail.com までご連絡ください。また、管轄のデータ保護当局に苦情を申し立てる権利を有する場合があります。",
    ],
  },
  {
    id: "children",
    title: "第10条（児童）",
    paragraphs: [
      "本サービスは、16歳未満の児童（お住まいの地域で定められる年齢を下回る方）を主な対象とするものではありません。当社は、意図的に児童から個人情報を取得しません。",
    ],
  },
  {
    id: "transfers",
    title: "第11条（国外への移転）",
    paragraphs: [
      "データは、日本、米国、欧州経済領域、その他当社の委託先が所在する地域で処理される場合があります。必要に応じて、標準契約条項等の適切な保護措置を講じます。",
    ],
  },
  {
    id: "changes",
    title: "第12条（本ポリシーの変更）",
    paragraphs: [
      "当社は、本ポリシーを変更することがあります。変更後の内容は本ページに掲載し、末尾の「最終更新日」を更新します。過去版はアーカイブした場合 /legal/en/archive および /legal/ja/archive から参照できます。",
    ],
  },
  {
    id: "contact",
    title: "第13条（お問い合わせ）",
    paragraphs: [
      "本ポリシーに関するお問い合わせは、soonerutingna@gmail.com または https://lp.sooner.sh に掲載する連絡方法にて受け付けます。",
    ],
  },
];

export const legalMeta = {
  en: {
    termsTitle: "Terms of Service",
    privacyTitle: "Privacy Policy",
    backHome: "Back to home",
    switchJa: "日本語",
    switchEn: "English",
    otherDocTerms: "Terms of Service",
    otherDocPrivacy: "Privacy Policy",
    lastUpdated: "Last updated: April 15, 2026",
    notice:
      "This document is provided for informational purposes and does not constitute legal advice. You may wish to consult a qualified attorney for your jurisdiction.",
    contactEmailLabel: "Contact:",
    archiveLink: "Previous versions",
    archiveIndex: {
      pageTitle: "Archived legal documents",
      pageDesc: "Earlier versions of our Terms and Privacy Policy, kept when we publish updates.",
      empty:
        "No archived versions are published in the app yet. When we update the Terms or Privacy Policy, the previous text is added here first—see the comment at the top of legalContent.ts and legalArchive.ts.",
      currentDocs: "Current documents:",
      contactPrefix: "Questions:",
    },
  },
  ja: {
    termsTitle: "利用規約",
    privacyTitle: "プライバシーポリシー",
    backHome: "ホームに戻る",
    switchJa: "日本語",
    switchEn: "English",
    otherDocTerms: "利用規約",
    otherDocPrivacy: "プライバシーポリシー",
    lastUpdated: "最終更新日：2026年4月15日",
    notice:
      "本書は一般的な説明を目的とするものであり、法的助言を構成するものではありません。必要に応じて専門家にご相談ください。",
    contactEmailLabel: "お問い合わせ：",
    archiveLink: "過去のバージョン",
    archiveIndex: {
      pageTitle: "過去の法的文書",
      pageDesc: "利用規約・プライバシーポリシーを更新した際に保管した、以前のテキストです。",
      empty:
        "まだアーカイブされた版がありません。文面を更新する際は、legalContent.ts を編集する前に legalArchive.ts の LEGAL_SNAPSHOTS に前版を追加してください（各ファイル先頭のコメント参照）。",
      currentDocs: "現行の文書：",
      contactPrefix: "ご質問：",
    },
  },
};
