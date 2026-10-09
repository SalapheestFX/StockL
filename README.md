StockL — AI Trading Research Desk

Research smarter. Understand the market. Decide independently.

StockL is an AI-assisted trading research workspace designed to help traders explore US equities, understand market movements, review financial news, and generate structured research reports using natural language.

Built for the Bitget AI Base Camp Hackathon S2, StockL combines market data, financial news, interactive price charts, and Qwen-powered AI analysis in one dashboard.

The goal is to make financial research more accessible and organized while keeping humans in control of investment decisions.

 Live Demo

Try StockL: https://stockl-research.vercel.app/#news

GitHub Repository: https://github.com/SalapheestFX/StockL

✨ Features

🤖 AI-Powered Research

Ask questions about stocks, market risks, potential catalysts, and relationships between companies. StockL uses Qwen3.6-Plus to generate structured research reports based on the question and available context.

📊 Market Data

Retrieve market quotes and index information to help understand current market conditions.

The dashboard currently focuses on:

- Apple Inc. (AAPL)
- NVIDIA Corporation (NVDA)
- Tesla Inc. (TSLA)
- S&P 500
- Nasdaq Composite

Market data availability and freshness depend on the upstream data provider.

📰 Financial News

Access financial headlines and related news information to add context to stock research.

News and market data help users investigate possible catalysts rather than relying on an AI response alone.

📈 Interactive Price Charts

Explore stock-price movements through interactive charts integrated into the research dashboard.

⚡ Streaming AI Responses

StockL supports progressively displaying generated research text, allowing users to begin reading a report while the remaining content is still being generated.

🛡️ Human-in-the-Loop Research

StockL is designed to assist traders, not replace them.

- AI generates research and analytical explanations.
- Users review the information and evaluate the reasoning.
- Humans retain responsibility for investment decisions.

StockL does not claim that its AI predictions are guaranteed to be correct or profitable.

💎 Modern Dashboard

The responsive interface uses a polished liquid-glass-inspired design to bring research, market information, charts, and news together in one workspace.

🧠 How It Works

StockL combines several components into a single research workflow.

1. Ask a question: The user enters a stock research question.
2. Collect context: The backend retrieves available market data and financial news.
3. Generate analysis: The research question and collected context are sent to Qwen3.6-Plus through the configured Bitget hackathon model endpoint.
4. Stream the report: The backend processes the model's streamed response and progressively displays the generated text in the dashboard.
5. Review the findings: The user examines the report alongside the available market information, charts, and news.
6. Make an informed decision: The user remains responsible for evaluating the research and deciding what to do next.

AI-generated conclusions should always be checked against reliable sources.

🏗️ Technology Stack

Technology| Purpose
Next.js| Web application and server-side API routes
React| Interactive user interface
TypeScript| Type-safe application development
Tailwind CSS| Responsive dashboard styling
Recharts| Data visualization
Qwen3.6-Plus| AI-powered research generation
Bitget Hackathon Model Endpoint| Access to the configured Qwen model
Market-data API| Stock and index information
Financial News API| News aggregation
Vercel| Application deployment
GitHub| Source code and version control

🏛️ Architecture

StockL separates the user interface, data retrieval, and AI research generation.

┌───────────────────────────────┐
│        StockL Dashboard       │
│                               │
│  Research · Charts · News     │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│      Next.js API Routes       │
│                               │
│   Market Data + Financial News│
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│     Qwen3.6-Plus via Bitget   │
│                               │
│      AI Research Generation   │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│    Streamed Research Report   │
│                               │
│   Human Review and Decisions  │
└───────────────────────────────┘

The model API key is configured on the server rather than exposed in client-side code.

⚙️ Getting Started

Prerequisites

Install the following:

- Node.js
- npm
- Git

You will also need valid credentials for the AI model endpoint and any external data services required by your configuration.

1. Clone the Repository

git clone https://github.com/SalapheestFX/StockL.git

2. Enter the Project Directory

cd StockL

3. Install Dependencies

npm install

4. Configure Environment Variables

Create a ".env.local" file in the project root.

Add the following AI configuration, using your own authorized credentials:

QWEN_API_KEY=your_qwen_api_key
QWEN_BASE_URL=https://hackathon.bitgetops.com/v1
QWEN_MODEL=qwen3.6-plus

Additional environment variables may be required by the market-data and news API integrations in your local configuration.

Security: Never commit ".env.local" or publish API keys in your repository, screenshots, browser code, or public documentation.

5. Start the Development Server

npm run dev

Open:

http://localhost:3000

The application should now be available locally.

🌐 Deployment

StockL is designed to be deployed on Vercel.

General deployment workflow:

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Configure the required environment variables in the Vercel project settings.
4. Deploy the application.
5. Test the deployed dashboard, market-data retrieval, financial news, and AI research workflow.

Production environment variables must be configured separately from local ".env.local" values.

🧪 Current Project Scope

StockL currently focuses on AI-assisted US equity research.

The project includes a deployed dashboard, market-data and news retrieval, Qwen-powered research generation, and a streaming research-response workflow.

The current scope does not establish:

- Autonomous order execution.
- A validated profitable trading strategy.
- Guaranteed price predictions.
- Verified trading performance or backtesting results.
- Complete support for every tokenized US stock or on-chain trading venue.

These capabilities would require additional implementation, testing, and validation.

🗺️ Roadmap

Potential future improvements include:

- [ ] Historical strategy evaluation and backtesting.
- [ ] Stronger source attribution in AI research reports.
- [ ] More comprehensive portfolio and risk analysis.
- [ ] Expanded market-data and financial-news coverage.
- [ ] Research history and saved reports.
- [ ] Support for tokenized US equities where reliable data access is available.
- [ ] More extensive automated testing and production monitoring.
- [ ] Evaluation of research quality and factual accuracy.

🏆 Hackathon Track

Event: Bitget AI Base Camp Hackathon S2
Track: AI Trading Desk
Project: StockL — AI Trading Research Desk

StockL fits the AI Trading Desk concept by using AI to support human-led market research rather than positioning the model as an autonomous trading decision-maker.

⚠️ Disclaimer

StockL is an experimental AI-assisted financial research application.

Market data may be delayed, incomplete, or inaccurate. Financial news and AI-generated reports may contain errors or omit relevant information.

Nothing provided by StockL constitutes financial, investment, or trading advice. The platform does not guarantee the accuracy of its analysis or the profitability of any investment decision.

Always verify important information independently and assess the risks before making financial decisions.

📄 License

A license has not yet been specified for this repository. All rights remain with their respective owners unless a license is added.
