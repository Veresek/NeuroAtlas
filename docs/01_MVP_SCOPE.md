# Zakres Funkcjonalności MVP (Faza 1)

Głównym celem MVP jest jak najszybsze zweryfikowanie pomysłu i dostarczenie podstawowej wartości edukacyjnej użytkownikom przy minimalnym nakładzie pracy początkowej.

## A. Uproszczony Model Mózgu (Interaktywny)
Zamiast budować wysoce zaawansowany i kosztowny w renderowaniu model 3D, w MVP proponuję:
- **Interaktywna mapa 2D lub prosty model 3D (np. low poly):** Pokazująca główne obszary mózgu (płaty, móżdżek).
- **Trzy pokazowe stymulanty/czynniki:** (np. Kofeina, Stres, Alkohol).
- **Działanie:** Wybranie czynnika z listy podświetla docelowe obszary w mózgu i wyświetla krótki opis pokazujący "co się dzieje".

## B. Dobre i Złe Nawyki
- Lista 3 dobrych i 3 złych nawyków (np. regularny sen, nadmiar cukru).
- Kliknięcie w nawyk podświetla odpowiednią część mózgu (integracja z Modelem) i wyświetla krótki tekst + orientacyjną wartość procentową (np. *wpływ na koncentrację: +20%*).

## C. Podstawowe Quizy (Bez logowania)
- **Ograniczona pula kategorii:** Na start tylko 2 kategorie: *Anatomia mózgu* oraz *Wpływ substancji psychoaktywnych*.
- **Ograniczony algorytm:** Jeden, uniwersalny poziom trudności. Brak konieczności zakładania konta – użytkownik po prostu rozwiązuje test (np. 5 pytań) i na końcu widzi swój wynik w ujęciu procentowym.

---

## Propozycje UX / UI na start
1. **Brak systemu kont:** Odrzucenie uwierzytelniania w MVP mocno skraca czas developmentu. Wyniki można trzymać w Local Storage.
2. **Mobile-First:** Aplikacje edukacyjne masowo konsumuje się na telefonach.
3. **Słowniczek (Glossary):** Dodanie małej bazy pojęć (np. synapsa, dopamina) wyświetlanej jako tooltip.
4. **Tryb Ciemny (Dark Mode):** Standard dla komfortu oczu przy nauce.

---

## Czego celowo NIE robimy w MVP (Out of Scope)
- Animacji drobin molekularnych, neuroprzekaźników i zjawisk w czasie rzeczywistym.
- Skomplikowanego algorytmu adaptującego poziom quizu dla użytkownika.
- Integracji z social mediami.
- Systemu autoryzacji (Logowanie/Rejestracja).
