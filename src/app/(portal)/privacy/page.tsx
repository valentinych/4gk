import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description: "Polityka prywatności serwisu 4gk.pl — informacje o przetwarzaniu danych osobowych zgodnie z RODO.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Strona główna
      </Link>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Polityka prywatności</h1>
      <p className="mt-2 text-sm text-muted">Ostatnia aktualizacja: 20 marca 2026 r.</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="text-base font-bold text-foreground">1. Administrator danych</h2>
          <p className="mt-2">
            Administratorem danych osobowych zbieranych za pośrednictwem serwisu <strong>4gk.pl</strong> jest
            zespół portalu 4gk.pl (dalej: „Administrator"). Kontakt z Administratorem jest możliwy
            pod adresem e-mail: <a href="mailto:admin@4gk.pl" className="font-medium underline underline-offset-2 hover:text-foreground">admin@4gk.pl</a>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">2. Podstawa prawna przetwarzania</h2>
          <p className="mt-2">Dane osobowe przetwarzane są na podstawie:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Art. 6 ust. 1 lit. a RODO</strong> — zgoda użytkownika (logowanie przez Google OAuth);</li>
            <li><strong>Art. 6 ust. 1 lit. b RODO</strong> — niezbędność do wykonania umowy o świadczenie usług drogą elektroniczną;</li>
            <li><strong>Art. 6 ust. 1 lit. f RODO</strong> — prawnie uzasadniony interes Administratora (zapewnienie bezpieczeństwa, analityka).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">3. Zakres zbieranych danych</h2>
          <p className="mt-2">Serwis zbiera następujące dane:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Dane konta Google</strong> — imię, nazwisko, adres e-mail, zdjęcie profilowe (przekazywane automatycznie podczas logowania przez Google OAuth);</li>
            <li><strong>Identyfikator gracza rating.chgk.info</strong> — opcjonalnie podawany przez użytkownika w celu powiązania profilu;</li>
            <li><strong>Dane techniczne</strong> — adres IP, typ przeglądarki, system operacyjny (gromadzone automatycznie w logach serwera).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">4. Cel przetwarzania danych</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Uwierzytelnianie użytkowników i zarządzanie kontami;</li>
            <li>Wyświetlanie profilu gracza i wyników turniejów;</li>
            <li>Zarządzanie kalendarzem wydarzeń i systemem gier online;</li>
            <li>Zapewnienie bezpieczeństwa i prawidłowego funkcjonowania serwisu;</li>
            <li>Komunikacja z użytkownikami w sprawach technicznych.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">5. Pliki cookie</h2>
          <p className="mt-2">Serwis wykorzystuje następujące rodzaje plików cookie:</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left font-semibold text-foreground">Nazwa</th>
                  <th className="py-2 pr-4 text-left font-semibold text-foreground">Cel</th>
                  <th className="py-2 pr-4 text-left font-semibold text-foreground">Okres</th>
                  <th className="py-2 text-left font-semibold text-foreground">Typ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr>
                  <td className="py-2 pr-4 font-mono">next-auth.session-token</td>
                  <td className="py-2 pr-4">Sesja uwierzytelniania</td>
                  <td className="py-2 pr-4">Do 30 dni</td>
                  <td className="py-2">Niezbędne</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono">next-auth.csrf-token</td>
                  <td className="py-2 pr-4">Ochrona CSRF</td>
                  <td className="py-2 pr-4">Sesja</td>
                  <td className="py-2">Niezbędne</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono">next-auth.callback-url</td>
                  <td className="py-2 pr-4">Przekierowanie po logowaniu</td>
                  <td className="py-2 pr-4">Sesja</td>
                  <td className="py-2">Niezbędne</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            Serwis <strong>nie wykorzystuje</strong> plików cookie marketingowych, reklamowych ani śledzących.
            Zgoda na pliki cookie jest przechowywana w pamięci lokalnej przeglądarki (localStorage).
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">6. Udostępnianie danych</h2>
          <p className="mt-2">Dane osobowe mogą być udostępniane następującym podmiotom:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Google LLC</strong> — w ramach procesu uwierzytelniania OAuth 2.0;</li>
            <li><strong>Dostawca hostingu</strong> — w zakresie niezbędnym do utrzymania infrastruktury serwera.</li>
          </ul>
          <p className="mt-2">
            Dane nie są przekazywane do państw trzecich poza EOG, z wyjątkiem usług Google,
            które są objęte odpowiednimi zabezpieczeniami (Standardowe Klauzule Umowne).
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">7. Okres przechowywania</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Dane konta — do momentu usunięcia konta przez użytkownika;</li>
            <li>Logi serwera — do 90 dni;</li>
            <li>Pliki cookie sesji — do zakończenia sesji lub 30 dni.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">8. Prawa użytkownika</h2>
          <p className="mt-2">Zgodnie z RODO przysługują Ci następujące prawa:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Prawo dostępu</strong> (art. 15 RODO) — prawo do uzyskania informacji o przetwarzanych danych;</li>
            <li><strong>Prawo do sprostowania</strong> (art. 16 RODO) — prawo do poprawienia nieprawidłowych danych;</li>
            <li><strong>Prawo do usunięcia</strong> (art. 17 RODO) — prawo do żądania usunięcia danych („prawo do bycia zapomnianym");</li>
            <li><strong>Prawo do ograniczenia przetwarzania</strong> (art. 18 RODO);</li>
            <li><strong>Prawo do przenoszenia danych</strong> (art. 20 RODO);</li>
            <li><strong>Prawo do sprzeciwu</strong> (art. 21 RODO);</li>
            <li><strong>Prawo do cofnięcia zgody</strong> — w dowolnym momencie, bez wpływu na zgodność z prawem przetwarzania dokonanego przed cofnięciem;</li>
            <li><strong>Prawo do wniesienia skargi</strong> do Prezesa Urzędu Ochrony Danych Osobowych (PUODO).</li>
          </ul>
          <p className="mt-2">
            W celu realizacji swoich praw skontaktuj się z Administratorem pod adresem:{" "}
            <a href="mailto:admin@4gk.pl" className="font-medium underline underline-offset-2 hover:text-foreground">admin@4gk.pl</a>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">9. Bezpieczeństwo</h2>
          <p className="mt-2">
            Administrator stosuje odpowiednie środki techniczne i organizacyjne w celu ochrony danych osobowych,
            w tym szyfrowanie połączenia (HTTPS/TLS), bezpieczne przechowywanie haseł sesji
            oraz regularne aktualizacje oprogramowania.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">10. Zmiany polityki prywatności</h2>
          <p className="mt-2">
            Administrator zastrzega sobie prawo do wprowadzenia zmian w niniejszej Polityce Prywatności.
            O istotnych zmianach użytkownicy zostaną poinformowani za pośrednictwem serwisu.
            Aktualna wersja polityki jest zawsze dostępna pod adresem{" "}
            <Link href="/privacy" className="font-medium underline underline-offset-2 hover:text-foreground">4gk.pl/privacy</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
