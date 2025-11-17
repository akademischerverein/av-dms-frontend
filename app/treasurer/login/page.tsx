"use client"

import { useState } from "react"
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

const TREASURER_PASSWORD = "kassenwart2024"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulate a small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 300))

    if (password === TREASURER_PASSWORD) {
      // Store authentication in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("treasurerAuthenticated", "true")
        localStorage.setItem("treasurerAuthTime", Date.now().toString())
      }

      toast({
        title: "Erfolgreich angemeldet",
        description: "Sie werden zum Dashboard weitergeleitet.",
      })

      // Redirect to treasurer dashboard
      router.replace("/treasurer")
    } else {
      setError("Falsches Passwort. Bitte versuchen Sie es erneut.")
      setIsLoading(false)
    }
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

