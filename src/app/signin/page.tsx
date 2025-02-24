import { auth, signIn } from "@/auth"
import { redirect } from 'next/navigation'

export default async function SignIn() {
    const session = await auth()
    const user = session?.user

    if (user) {
        return redirect('/')
    }
    else {
        return (
            <>
                <h1>Please Login</h1>
                <form
                    action={async () => {
                        "use server"
                        await signIn("github")
                    }}
                >
                    <button type="submit">Signin with GitHub</button>
                </form>
                <form
                    action={async () => {
                        "use server"
                        await signIn("google")
                    }}
                >
                    <button type="submit">Signin with Google</button>
                </form>
            </>
        )
    }

}