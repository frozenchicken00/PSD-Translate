import { auth, signOut } from "@/auth"
import { redirect } from 'next/navigation'
import Image from "next/image"

export default async function Profile() {
    const session = await auth();
    const user = session?.user
    if (!session) {
        return redirect('/signin');
    }

    if (user) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary mb-4 transform -rotate-1">Your Profile</h1>
                    <div className="speech-bubble">
                        <p>Welcome back, {user.name}! Manage your account and view your translation history.</p>
                    </div>
                </div>
                
                <div className="comic-panel mb-8">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        {user.image ? (
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden">
                                    <Image
                                        src={user.image} 
                                        alt={user.name || 'User'} 
                                        className="w-full h-full object-cover"
                                        width={100}
                                        height={100}
                                    />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-accent rounded-full p-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                </div>
                            </div>
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center text-4xl font-bold border-4 border-primary">
                                {user.name?.charAt(0) || 'U'}
                            </div>
                        )}
                        
                        <div className="flex-1 text-center sm:text-left">
                            <h2 className="text-2xl font-bold">{user.name}</h2>
                            <p className="text-foreground/70 mb-3">{user.email}</p>
                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                                    Translator
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary/20 text-secondary">
                                    Free Plan
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="comic-panel bg-panel">
                        <h3 className="text-xl font-bold mb-3 text-primary">Account Stats</h3>
                        <ul className="space-y-3">
                            <li className="flex justify-between items-center border-b border-foreground/10 pb-2">
                                <span>Joined</span>
                                <span className="font-medium">February 2025</span>
                            </li>
                            <li className="flex justify-between items-center border-b border-foreground/10 pb-2">
                                <span>Translations</span>
                                <span className="font-medium">12</span>
                            </li>
                            <li className="flex justify-between items-center border-b border-foreground/10 pb-2">
                                <span>Storage Used</span>
                                <span className="font-medium">84 MB</span>
                            </li>
                            <li className="flex justify-between items-center">
                                <span>Monthly Quota</span>
                                <span className="font-medium">12/20 files</span>
                            </li>
                        </ul>
                    </div>
                    
                    <div className="comic-panel bg-panel">
                        <h3 className="text-xl font-bold mb-3 text-secondary">Recent Activity</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-2 border-b border-foreground/10 pb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <div>
                                    <p className="font-medium">Uploaded summer_romance.psd</p>
                                    <p className="text-xs text-foreground/70">Feb 26, 2025</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-2 border-b border-foreground/10 pb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                </svg>
                                <div>
                                    <p className="font-medium">Translated school_days_ch3.psd</p>
                                    <p className="text-xs text-foreground/70">Feb 24, 2025</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <div>
                                    <p className="font-medium">Downloaded manga_ch5_en.psd</p>
                                    <p className="text-xs text-foreground/70">Feb 22, 2025</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
                
                <div className="flex justify-center">
                    <form
                        action={async () => {
                            "use server"
                            await signOut({ redirectTo: '/signin' })
                        }}
                    >
                        <button type="submit" className="btn bg-foreground/80 text-background hover:bg-foreground flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                        </button>
                    </form>
                </div>
            </div>
        )
    }
}