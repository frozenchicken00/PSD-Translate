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

## Deploying to Vercel

### Service Account Setup

To deploy the application with the Google Cloud service account:

1. **Create a vercel.json file** at the root of your project:
   ```json
   {
     "buildCommand": "next build",
     "outputDirectory": ".next",
     "installCommand": "npm install",
     "files": [
       "service-account.json"
     ]
   }
   ```

2. **Configure Vercel Environment Variables**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add the following:
     - `GCS_PROJECT_ID`: Your Google Cloud project ID
     - `GCS_BUCKET_NAME`: Your Google Cloud Storage bucket name
     - `DEEPL_API_KEY`: Your DeepL API key
     - `ADOBE_CLIENT_ID`: Your Adobe API client ID
     - `ADOBE_CLIENT_SECRET`: Your Adobe API client secret
   - Optionally add `GOOGLE_APPLICATION_CREDENTIALS_JSON` with the entire content of your service-account.json as a backup

3. **Add your service-account.json file** to your repository (make sure it's included in your `.gitignore` if the repository is public).

4. **Deploy to Vercel** using the Vercel CLI or GitHub integration.

### Troubleshooting Deployment

If you encounter issues with the service account:

1. Check the Vercel build logs to verify the service account file is being found
2. Ensure the service account has sufficient permissions
3. Try the fallback to environment variables by setting `GOOGLE_APPLICATION_CREDENTIALS_JSON`