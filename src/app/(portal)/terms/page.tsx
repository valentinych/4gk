import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Regulamin",
  description: "Regulamin korzystania z serwisu 4gk.pl.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Strona główna
      </Link>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Regulamin serwisu</h1>
      <p className="mt-2 text-sm text-muted">Ostatnia aktualizacja: 20 marca 2026 r.</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="text-base font-bold text-foreground">1. Postanowienia ogólne</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Niniejszy Regulamin określa zasady korzystania z serwisu internetowego <strong>4gk.pl</strong> (dalej: „Serwis").
            </li>
            <li>
              Serwis jest prowadzony przez zespół portalu 4gk.pl (dalej: „Usługodawca").
            </li>
            <li>
              Korzystanie z Serwisu oznacza akceptację niniejszego Regulaminu oraz{" "}
              <Link href="/privacy" className="font-medium underline underline-offset-2 hover:text-foreground">Polityki prywatności</Link>.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">2. Charakter Serwisu</h2>
          <p className="mt-2">
            Serwis 4gk.pl jest portalem informacyjnym poświęconym grom intelektualnym w Polsce.
            Umożliwia przeglądanie wyników turniejów, kalendarza wydarzeń, korzystanie z systemu
            gier online (buzzer) oraz publikowanie aktualności.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">3. Rejestracja i konto</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Rejestracja w Serwisie odbywa się wyłącznie za pośrednictwem logowania kontem Google (OAuth 2.0).</li>
            <li>Użytkownik może opcjonalnie powiązać swoje konto z profilem na rating.chgk.info.</li>
            <li>Użytkownik zobowiązuje się do podawania prawdziwych danych.</li>
            <li>Użytkownik może w każdym momencie usunąć swoje konto, kontaktując się z Usługodawcą pod adresem{" "}
              <a href="mailto:admin@4gk.pl" className="font-medium underline underline-offset-2 hover:text-foreground">admin@4gk.pl</a>.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">4. Zasady korzystania</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Użytkownik zobowiązuje się do korzystania z Serwisu zgodnie z obowiązującym prawem i dobrymi obyczajami.</li>
            <li>Zabronione jest podejmowanie działań mogących zakłócić prawidłowe funkcjonowanie Serwisu.</li>
            <li>Zabronione jest wprowadzanie treści o charakterze bezprawnym, obraźliwym lub naruszającym prawa osób trzecich.</li>
            <li>Usługodawca zastrzega sobie prawo do usunięcia konta użytkownika naruszającego Regulamin.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">5. Role użytkowników</h2>
          <p className="mt-2">W Serwisie funkcjonują następujące role:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Gracz</strong> — domyślna rola, umożliwiająca przeglądanie treści i korzystanie z systemu gier online;</li>
            <li><strong>Moderator</strong> — uprawnienia do tworzenia gier online;</li>
            <li><strong>Organizator</strong> — uprawnienia Moderatora oraz zarządzanie kalendarzem wydarzeń;</li>
            <li><strong>Administrator</strong> — pełne uprawnienia do zarządzania Serwisem.</li>
          </ul>
          <p className="mt-2">
            Role są przyznawane przez Administratora. Użytkownik nie ma prawa samodzielnie zmieniać swojej roli.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">6. Własność intelektualna</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Treści publikowane w Serwisie (teksty, grafiki, logotypy) stanowią własność Usługodawcy lub podmiotów uprawnionych.</li>
            <li>Wyniki turniejów prezentowane w Serwisie pochodzą z publicznych źródeł i serwisu rating.chgk.info.</li>
            <li>Kopiowanie, rozpowszechnianie lub modyfikacja treści Serwisu bez zgody Usługodawcy jest zabronione.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">7. Odpowiedzialność</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Serwis jest udostępniany w stanie „takim, jaki jest" (as is), bez gwarancji dostępności ani bezbłędnego działania.</li>
            <li>Usługodawca nie ponosi odpowiedzialności za treści publikowane przez użytkowników.</li>
            <li>Usługodawca nie ponosi odpowiedzialności za przerwy w działaniu Serwisu spowodowane przyczynami technicznymi lub siłą wyższą.</li>
            <li>Usługodawca nie ponosi odpowiedzialności za treści na stronach zewnętrznych, do których prowadzą linki w Serwisie.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">8. Ochrona danych osobowych</h2>
          <p className="mt-2">
            Zasady przetwarzania danych osobowych są opisane w{" "}
            <Link href="/privacy" className="font-medium underline underline-offset-2 hover:text-foreground">Polityce prywatności</Link>,
            która stanowi integralną część niniejszego Regulaminu.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">9. Reklamacje</h2>
          <p className="mt-2">
            Reklamacje dotyczące funkcjonowania Serwisu można składać drogą elektroniczną na adres{" "}
            <a href="mailto:admin@4gk.pl" className="font-medium underline underline-offset-2 hover:text-foreground">admin@4gk.pl</a>.
            Usługodawca rozpatrzy reklamację w terminie 14 dni roboczych od daty jej otrzymania.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">10. Zmiany Regulaminu</h2>
          <p className="mt-2">
            Usługodawca zastrzega sobie prawo do zmiany niniejszego Regulaminu. O istotnych zmianach
            użytkownicy zostaną poinformowani za pośrednictwem Serwisu z co najmniej 14-dniowym wyprzedzeniem.
            Aktualna wersja Regulaminu jest dostępna pod adresem{" "}
            <Link href="/terms" className="font-medium underline underline-offset-2 hover:text-foreground">4gk.pl/terms</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground">11. Prawo właściwe</h2>
          <p className="mt-2">
            W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego,
            w szczególności Kodeksu cywilnego, Ustawy o świadczeniu usług drogą elektroniczną
            oraz Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 (RODO).
          </p>
        </section>
      </div>
    </div>
  );
}
