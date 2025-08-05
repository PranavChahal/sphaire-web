# Sphaire - 3D Modeling Web Application

A powerful 3D modeling web application built with React, Next.js, Babylon.js, and AI services.

## Features

- **3D Modeling**: Advanced CAD modeling with OpenCascade.js
- **Real-time 3D Rendering**: High-performance 3D visualization with Babylon.js
- **AI Integration**: AI-powered model generation and assistance
- **Texture Generation**: Advanced PBR texture creation
- **Voice Commands**: Voice-controlled modeling operations
- **Export Capabilities**: Support for multiple 3D file formats
- **Modern UI**: Responsive design with Tailwind CSS

## Tech Stack

- **Frontend**: React, Next.js, TypeScript
- **3D Graphics**: Babylon.js
- **CAD Engine**: OpenCascade.js
- **AI Services**: Custom AI integration for model generation
- **Styling**: Tailwind CSS
- **Build Tool**: Next.js with custom webpack configuration

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sphaire.git
cd sphaire
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file with the following variables:
```
OPENAI_API_KEY=your_openai_api_key
STABILITY_API_KEY=your_stability_api_key
```

## Deployment

This application is optimized for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Set up environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

**Live Demo**: [https://sphaire-18xargqxx-pranavs-projects-17bd5116.vercel.app](https://sphaire-18xargqxx-pranavs-projects-17bd5116.vercel.app)

## Project Structure

```
├── components/          # React components
├── pages/              # Next.js pages and API routes
├── utils/              # Utility functions
├── services/           # External service integrations
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── workers/            # Web workers for heavy computations
├── public/             # Static assets
└── styles/             # CSS and styling files
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Babylon.js for 3D rendering capabilities
- OpenCascade.js for CAD functionality
- The Next.js team for the excellent framework
