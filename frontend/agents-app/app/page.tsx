import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, LogIn, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-beige-50 via-beige-100 to-beige-200 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800 p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-2 border-gold/20 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg">
        <CardHeader className="text-center space-y-6 pb-8">
          {/* Logo/Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gold/30 blur-2xl rounded-full"></div>
              <div className="relative bg-gradient-to-br from-gold to-bronze p-6 rounded-full shadow-xl">
                <Gamepad2 className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-beige-900 via-gold to-bronze bg-clip-text text-transparent leading-tight">
              وطن
            </h1>
            <CardTitle className="text-3xl md:text-4xl font-bold text-foreground">
              شحن الألعاب الإلكترونية
            </CardTitle>
            <CardDescription className="text-lg md:text-xl text-muted-foreground">
              اشحن حساباتك بأسرع وقت وأفضل الأسعار
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-beige-100/50 to-white/50 dark:from-neutral-800/50 dark:to-neutral-700/50">
              <div className="text-3xl mb-2">⚡</div>
              <p className="text-sm font-semibold">توصيل فوري</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-beige-100/50 to-white/50 dark:from-neutral-800/50 dark:to-neutral-700/50">
              <div className="text-3xl mb-2">🔒</div>
              <p className="text-sm font-semibold">دفع آمن</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-beige-100/50 to-white/50 dark:from-neutral-800/50 dark:to-neutral-700/50">
              <div className="text-3xl mb-2">🎁</div>
              <p className="text-sm font-semibold">عروض مميزة</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <Link href="/ar" className="w-full">
              <Button 
                size="lg" 
                className="w-full text-lg h-14 bg-gradient-to-r from-gold to-bronze hover:from-gold-light hover:to-gold shadow-lg hover:shadow-xl transition-all group"
              >
                <Gamepad2 className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                الدخول إلى المتجر
                <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <div className="flex gap-3">
              <Link href="/ar" className="flex-1">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full border-2 border-gold/30 hover:border-gold hover:bg-gold/10"
                >
                  العربية 🇸🇦
                </Button>
              </Link>
              <Link href="/en" className="flex-1">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full border-2 border-gold/30 hover:border-gold hover:bg-gold/10"
                >
                  English 🇬🇧
                </Button>
              </Link>
              <Link href="/tr" className="flex-1">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full border-2 border-gold/30 hover:border-gold hover:bg-gold/10"
                >
                  Türkçe 🇹🇷
                </Button>
              </Link>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t border-beige-200 dark:border-neutral-700">
            <p>منصة موثوقة لشحن جميع الألعاب الإلكترونية</p>
            <p className="mt-1">PUBG • Free Fire • Likee • وأكثر من 9 ألعاب</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
