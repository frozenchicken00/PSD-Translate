import { auth, signOut } from "@/auth"
import { redirect } from 'next/navigation'

export default async function Profile() {
    const session = await auth();
    const user = session?.user
    if (!session) {
        return redirect('/signin');
    }

    if (user) {
        return (
            <>
                <h1>Welcome {user.name}</h1>
                <form
                    action={async () => {
                        "use server"
                        await signOut({ redirectTo: '/signin' })
                    }}
                >
                    <button type="submit">Sign Out</button>
                </form>
            </>
        )
    }
}