# Tanishka Jain: profile for the "Ask Tanishka's AI" assistant

<!-- Built only from content already on the website (index.html and js/main.js). Each "## " heading is one
     retrievable section; the assistant cites these names. When the site changes, update this file to match.
     Project sections carry "(id: …)" so the openProject tool can open the matching door and card. -->

## Summary
Tanishka Jain is a data scientist, AI engineer and full-stack developer based in Jaipur, India. Roles she is described with on the site: Data Scientist, AI Engineer, Data Analyst, Full Stack Developer. She is open to Data, AI and Full Stack roles, available for work, remote or in Jaipur, India.
In her words: she turns messy data into dashboards leaders decide with, trains models that recognise how people feel, and ships AI products people can actually use. Analytics taught her to check every number; AI taught her to make those numbers speak.

## Key numbers
- 9.8/10 CGPA, B.Sc. (Hons) Data Analytics & AI
- 95% accuracy on her award-winning emotion model
- 30% faster reporting through automation
- 17 public projects (repositories) on GitHub

## Tools and technologies
Tools listed on the site: Python, SQL, Power BI, Advanced Excel, PyTorch, TensorFlow, Gemini, Claude, RAG, LangChain, N8N, Next.js, React, Node.js, TypeScript, PostgreSQL, Redis, AWS.

## Area: Generative & Agentic AI
"AI that gives grounded answers." Tanishka builds LLM apps and automated agent workflows, and audits their outputs so the answers stay tied to real data. Tools: Gemini, Claude, RAG, LangChain, N8N, prompt engineering. Projects in this area: 3Rings, AI Automation Workflows.

## Area: Machine Learning
"Teach computers to spot patterns." Tanishka trains and tunes models that recognise patterns, from emotions in text to characters in images, and validates them properly. Tools: Python, PyTorch, TensorFlow, Scikit-learn, NLP, OpenCV. Projects in this area: Emotion-Aware Chatbot, Text-to-Braille Converter.

## Area: Data & Analytics
"Find the story in the numbers." Tanishka queries large datasets, tests ideas with statistics and A/B tests, and builds dashboards that leaders actually use to decide. Tools: SQL, Power BI, Advanced Excel, Pandas, A/B testing, statistics. Projects in this area: Executive Reporting Dashboards.

## Area: Full Stack
"From idea to live product." Tanishka takes an idea from database design to a deployed web app, with secure sign-in, APIs and the AI built in. Tools: Next.js, React, Node.js, TypeScript, PostgreSQL, AWS. Projects in this area: VitalSync, CineStream, Live Chat Room.

## Project: 3Rings (id: rings)
AI product, 2026. Status: in active development; Tanishka is leading it now. Live site: https://3rings.io
3Rings is the operating system for creator revenue. It connects YouTube, Instagram and TikTok to show what's driving growth and what to post next. It also finds brand deals and collaborators, and automates outreach, so creators earn more with less busywork.
Overview: 3Rings is an AI-driven analytics and growth platform for content creators. It brings data from YouTube, Instagram and TikTok together and uses an LLM to turn performance signals into insights and recommendations.
Role: Project Lead and AI full-stack developer. Company: Persist Ventures (US). Stack: Next.js, TypeScript, PostgreSQL, Redis, Gemini, Skyvern, AWS.
What she did:
- Leads end-to-end delivery: architecture, product decisions and timelines, working with design, API-integration, product and management stakeholders.
- Designed the AI pipeline: platform data ingestion, signal extraction, Gemini inference and Redis-cached serving, on a 16-table PostgreSQL schema.
- Audited AI outputs, traced made-up metrics and ungrounded advice to their root cause, and re-scoped features around verified data.
- Deployed on AWS with CI/CD, leading the move to AWS RDS, and secured Google, Meta and TikTok platform approvals.
Why it's generative and agentic:
- Writes: Gemini generates growth strategies and brand outreach emails from real platform data.
- Acts: an AI browser agent (Skyvern) handles outreach steps on its own.
- Finds: it mines creators' public content for sponsorship opportunities (in progress).
- Trust: Tanishka audited the AI's outputs and rebuilt features so it only uses verified numbers.

## Project: Emotion-Aware Chatbot (id: chat)
AI research, 2025. Recognition: 1st prize at IIIM Hackathon 3.0 and 1st prize at IISU-ASSET 2025.
A supportive chatbot that recognises how someone feels and responds with care, built for people facing cyberbullying.
Overview: a generative AI chatbot that first detects the emotion behind a message, then replies in a way that fits. It runs as a web app with real-time, multi-turn conversation.
Role: developer and researcher. Accuracy: 95% emotion classification. Stack: Python, Flan-T5, DistilBERT, LSTM, Hugging Face, Flask.
What she did:
- Trained emotion classifiers (LSTM, Random Forest, Logistic Regression) reaching 95% accuracy with cross-validation, tuning and feature engineering.
- Built response generation with Flan-T5 and DistilBERT using RAG-style context injection.
- Deployed it as a Flask web app with real-time conversation.
- Won 1st prize at IIIM Hackathon 3.0 and at the IISU-ASSET 2025 poster presentation.

## Project: VitalSync (id: vital)
Healthcare web app, 2026, built during the Prodesk internship. Status: built and deployed (production). Live site: https://vitalsync-frontend-eight.vercel.app/
A healthcare dashboard where doctors and patients manage appointments, with an AI health assistant built in.
Overview: VitalSync is a production-grade healthcare dashboard with separate experiences for doctors and patients, and a Gemini-powered assistant that answers health questions using the patient's context.
Role: full-stack developer. Stack: Next.js 14, TypeScript, MongoDB, Gemini API, JWT.
What she did:
- Built the AI Health Assistant with RAG-style context injection and careful prompt design.
- Implemented role-based access so doctors and patients each see only what they should.
- Designed the full REST API: JWT sign-in, CRUD routes, appointment scheduling and data validation.
- Deployed on Vercel and Render with CI/CD workflows.
Code: https://github.com/Tanishkaa-py/vitalsync-frontend (frontend), https://github.com/Tanishkaa-py/Vital-sync-backend (backend).

## Project: Text-to-Braille Converter (id: braille)
Accessibility, AI + hardware (assistive tech).
Turns typed English into Braille, on screen and as raised physical dots through an Arduino, for visually impaired readers.
Overview: a web app that converts English text into Braille and drives Arduino servo motors to produce tactile output, with a CNN that recognises Braille characters.
Role: developer. Type: computer vision and hardware. Stack: Python, Flask, CNN, OpenCV, Arduino.
What she did:
- Built a CNN for multi-class Braille character recognition.
- Prepared images with OpenCV preprocessing and data augmentation, validated with cross-validation.
- Connected the app to Arduino servo motors over serial for real-time physical Braille output.
- Packaged the whole app to run on Windows.
Code: https://github.com/Tanishkaa-py/text-to-braille-project

## Project: AI Automation Workflows (id: flow)
Agentic automation, 2025, client work at KodeCrave for international clients.
Automated workflows that read, sort and summarise business information on their own, so teams do less manual work.
Overview: multi-step agentic workflows built in N8N that use LLMs to classify, summarise and route information between business tools.
Role: AI automation intern. Stack: N8N, LLM nodes, REST APIs, webhooks, ETL.
What she did:
- Designed N8N workflows combining LLM nodes, REST APIs and ETL pipelines.
- Built AI-driven classification, summarisation and process intelligence steps.
- Added error handling, data validation and JSON transformations so pipelines run reliably.
- Tracked pipeline performance with MLOps-style monitoring.

## Project: Executive Reporting Dashboards (id: bi)
Data analytics, 2024, at Celebal Technologies. Result: reporting 30% faster.
Power BI dashboards and automated reports that helped senior leaders make faster, data-backed decisions.
Overview: analysis and reporting work on large datasets, turned into executive dashboards and automated reporting pipelines.
Role: data analyst intern. Stack: SQL, Python, Power Query, Power BI.
What she did:
- Queried large datasets with complex SQL joins and aggregations for statistical analysis, A/B testing and predictive analytics.
- Automated reporting workflows with Python and Power Query, making reporting 30% faster.
- Built executive Power BI dashboards focused on clear data storytelling.

## Project: CineStream (id: cine)
Public repo. Netflix-style movie discovery with infinite scroll, favourites and AI mood-based recommendations. Stack: React.
Live site: https://cine-stream-6nno.vercel.app/ Code: https://github.com/Tanishkaa-py/Cine-Stream

## Project: Live Chat Room (id: chat-room)
Public repo. Messages appear instantly across every open browser, built to learn real-time communication. Stack: Socket.io, React.
Live site: https://live-chat-room-psi.vercel.app/ Code: https://github.com/Tanishkaa-py/live-chat-room

## Experience: AI Full Stack Developer & Project Lead, Persist Ventures (US)
June 2026 to now, remote. Leading end-to-end delivery of 3Rings, an AI creator analytics platform. Owns the architecture, the AI pipeline and the AWS deployment, and coordinates design, engineering and product.

## Experience: Full Stack Developer Intern, Prodesk
January to May 2026, remote. Built VitalSync, a healthcare AI dashboard, and an AI cover letter generator. Designed REST APIs with secure sign-in and shipped with CI/CD.

## Experience: AI Automation Intern, KodeCrave
2025, 2 months, Jaipur. Designed N8N agentic workflows for international clients that classify, summarise and route information automatically.

## Experience: Data Analyst Intern, Celebal Technologies
2024, 2 months, remote. Automated reporting with Python and Power Query, making it 30% faster. Built executive Power BI dashboards from large SQL datasets.

## Education
- M.Sc. Data Science, Manipal Academy of Higher Education, online, 2026 to now. Going deeper on statistics and machine learning alongside full-time work.
- B.Sc. (Hons) Data Analytics & AI, IIS University, Jaipur, 2023 to now. CGPA 9.8/10. This is where it all started: she fell for data in the classroom.

## Awards and leadership
- 1st prize, IIIM Hackathon 3.0, for her emotion-aware chatbot that supports people facing cyberbullying.
- 1st prize, IISU-ASSET 2025 (International Conference on AI Systems and Sustainable Technologies, March 2025), for the paper "Emotional Support Chatbot for Cyberbullying".
- Joint Secretary, Student Council at IIS University: coordinated university-wide programmes across departments.

## Certifications
- Google Data Analytics (Google)
- TensorFlow Developer Certificate (TensorFlow)
- AWS Certified Machine Learning (Amazon Web Services)
- Claude AI Workshop: Task Automation & Building with Claude (Anthropic, 2025)
- Power BI for Data Analysts (LinkedIn Learning, 2024)
- Intermediate SQL for Data Scientists (LinkedIn Learning, 2024)
- Mastering Data with Machine Learning (IBM SkillsBuild, 2024)

## Contact
Email: work.tanishkajain@gmail.com (she usually replies within a day). LinkedIn: https://www.linkedin.com/in/tanishkajain16/ GitHub: https://github.com/Tanishkaa-py
She is open to data, AI or full-stack roles and to project ideas. Her CV (PDF) is linked from the "README" button on the website. Visitors can also leave a message through this assistant.
