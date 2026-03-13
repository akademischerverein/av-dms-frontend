"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Lock, AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  useEffect(() => {
	fetch("https://belege.av-da.de/api/auth/whoami", {"credentials": "include"}).then((res) => res.json()).then((data) => {
		if (data.isAuthenticated) {
			toast({
				title: "Bereits angemeldet",
				description: "Sie werden zum Dashboard weitergeleitet.",
			})
			// already authenticated
			router.replace("/treasurer")
		}
	})
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulate a small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 300))
	let resp = await fetch("https://belege.av-da.de/api/auth/login", {"method": "POST", "body": JSON.stringify({"username": username, "password": password}), "headers": {"Content-Type": "application/json"}, "credentials": "include"})
	
	if (resp.status >= 500) {
		setError("Server-Fehler. Bitte versuchen Sie es später erneut.")
		setIsLoading(false)
	}
	let data = await resp.json()
	
	if (resp.status >= 400) {
		if (data.code === "RATE_LIMITED") {
			setError("Zu viele Loginversuche. Bitte versuchen Sie es später erneut.")
			setPassword("")
			setIsLoading(false)
			return
		} else if (data.code === "INVALID_LOGIN") {
			setError("Die Logindaten sind falsch. Bitte versuchen Sie es erneut.")
			setPassword("")
			setIsLoading(false)
			return
		} else if (data.code === "ALREADY_AUTHENTICATED") {
			toast({
				title: "Bereits angemeldet",
				description: "Sie werden zum Dashboard weitergeleitet.",
			})
			router.replace("/treasurer")
		}
	} else if (resp.status === 200) {
		toast({
			title: "Erfolgreich",
			description: "Hallo " + data.displayName + "! Sie werden zum Dashboard weitergeleitet.",
		})
		router.replace("/treasurer")
		return
	}
	
	setError("Unbekannter Fehler. Bitte versuchen Sie es erneut.")
	setPassword("")
	setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#e53b3e]/40 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-8">
          <Image src="/AV_Logo.jpg" alt="Logo" width={120} height={120} className="rounded-md shadow-md" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-2xl">Kassenwart-Anmeldung</CardTitle>
            </div>
            <CardDescription>Bitte geben Sie Ihr Passwort ein, um auf den Kassenwart-Bereich zuzugreifen.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
			  <div className="space-y-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Benutzername eingeben"
                  required
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passwort eingeben"
                  required
                  disabled={isLoading}
                  className="w-full"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Wird angemeldet..." : "Anmelden"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <Link href="/" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Zurück zur Startseite
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

