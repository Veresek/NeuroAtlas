# Przyszłość platformy: AI, ML i EEG (Opcje dla Fazy 2 i dalszych)

Oto propozycje na wzbogacenie platformy o zaawansowane technologie:

## A. Generowanie reakcji mózgu na podstawie opisu akcji (AI/LLM) 💡 *NOWOŚĆ*
- **Koncepcja:** Pełna interaktywność i otwartość na pomysły użytkownika.
- **Realizacja:** Użytkownik wpisuje w pole tekstowe dowolną czynność, np. *"Bieganie po lesie"* lub *"Rozwiązywanie trudnego równania matematycznego"*. Model AI przetwarza ten input i automatycznie opisuje zaangażowane partie mózgu, wysyłając sygnał do aplikacji. Na interaktywnym modelu 3D natychmiast podświetlają się aktywowane fragmenty (np. kora ruchowa z powodu biegu), a obok generowane jest przewidywane dla tej czynności pasmo fal EEG.

## B. Edukacyjna symulacja odczytów EEG (Chart.js / D3.js)
- **Koncepcja:** Zamiast podłączać urządzenie sprzętowe, każdemu znanemu nawykowi lub substancji z bazy przypisujemy renderowaną wizualizację fal EEG (Alfa, Beta, Theta, Delta, Gamma).
- **Realizacja:** Wybór "Medytacji" animuje w panelu bocznym spokojne linie fal Alfa. Wybór "Stresu" zmienia wykres na gwałtowne fale Beta/Gamma.

## C. Wirtualny "Neuro-Asystent" Edukacyjny (Chatbot / LLM)
- **Koncepcja:** Wbudowany na stronie "wykładowca".
- **Realizacja:** Czat podpięty pod API LLM (np. OpenAI po stronie FastAPI) ze ścisłym promptem systemowym robiącym z niego eksperta neurobiologii. Odpowiada na pytania związane tylko i wyłącznie z właśnie przerabianym na stronie zjawiskiem.

## D. Dynamiczne Generowanie Quizów przez AI
- **Koncepcja:** Personalizowane testy wiedzy.
- **Realizacja:** Algorytm śledzi, z jakim materiałem na platformie (np. sekcja anatomii, wpływ snu) użytkownik spędził najwięcej czasu, a backend prosi LLM o wygenerowanie unikalnego quizu z tych zagadnień "w locie".

## E. System Analizy Sentymentu (NLP) w sekcji Emocji
- **Koncepcja:** Klasyfikacja nastroju.
- **Realizacja:** Użytkownik opowiada o swoim dniu. Model NLP klasyfikuje tekst jako pozytywny lub negatywny stres, przekładając to na podświetlenia odpowiednich struktur mózgowych (np. zwiększona aktywność w ciele migdałowatym przy wykrytej złości lub smutku).
