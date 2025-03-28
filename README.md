# WebtoonTL - Webtoon Translation Service

WebtoonTL is a web application built with Next.js that allows users to translate webtoons and comics while preserving the original artwork. The service focuses on translating PSD files containing comic/webtoon content into different languages.

## Features

- **File Upload**: Support for uploading PSD files
- **Multiple Language Support**: Translate your content into 30 languages
- **Fast Processing**: Advanced AI technology completes most translations within minutes
- **Secure File Handling**: All original artwork and PSD files are handled securely and never shared
- **Download Translated Files**: Easily download your translated webtoon in PSD format

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) with Prisma adapter
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Cloud Storage**: [Google Cloud Storage](https://cloud.google.com/storage) for file handling
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **PSD Processing**: [Adobe Photoshop API](https://developer.adobe.com/photoshop/) for handling PSD files
- **Translation**: [DeepL API](https://www.deepl.com/docs-api) for high-quality text translation

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Google Cloud Service Account (for storage)
- Adobe Photoshop API credentials (To access to PSD files)
- DeepL API key (for translation)

### Environment Setup

Create a `.env.local` file with the following variables:


```
ADOBE_CLIENT_ID="example"
ADOBE_CLIENT_SECRET="example"

DEEPL_API_KEY="example"

GCS_KEYFILE="example"
GCS_PROJECT_ID="example"
GCS_BUCKET_NAME="example"
```