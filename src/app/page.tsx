export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-primary mb-4 transform -rotate-1">
          Welcome to WebtoonTL!
        </h1>
        <div className="speech-bubble max-w-2xl mx-auto">
          <p className="text-lg">
            Your one-stop solution for translating webtoons and comics! 
            Upload your files, translate your content, and share your work with fans around the world.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="comic-panel zoom-effect bg-accent/20">
          <h2 className="text-2xl mb-4 text-primary">Easy Translation</h2>
          <p className="mb-4">Upload your PSD files and get them translated quickly and accurately.</p>
          <div className="flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
        </div>

        <div className="comic-panel zoom-effect bg-secondary/20">
          <h2 className="text-2xl mb-4 text-secondary">Professional Quality</h2>
          <p className="mb-4">Maintain the artistic integrity of your webtoons with our high-quality translation service.</p>
          <div className="flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
        </div>

        <div className="comic-panel zoom-effect bg-primary/20">
          <h2 className="text-2xl mb-4">Global Reach</h2>
          <p className="mb-4">Connect with readers around the world by breaking language barriers.</p>
          <div className="flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="comic-panel zoom-effect bg-accent/20">
          <h2 className="text-2xl mb-4">Get Started Now</h2>
          <p className="mb-4">It's easy to begin! Sign in with your account and upload your first webtoon.</p>
          <div className="flex justify-center mt-4">
            <a href="/upload-file" className="btn text-lg px-8 py-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Start Translating
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}