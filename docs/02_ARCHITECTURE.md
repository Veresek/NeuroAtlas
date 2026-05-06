# Architektura Systemu (MVP)

## 1. Frontend (React.js)
- **Biblioteki:** `react-router-dom` do routingu, `zustand` lub `context api` do obsługi stanu.
- **Model mózgu:** Interaktywne grafiki oparte na SVG z obsługą kliknięć (CSS/hover states) lub prosta scena w `react-three-fiber` jeśli decydujemy się na odchudzone 3D.
- **Stylizacja:** Mobile-first, uwzględnienie Dark Mode (np. przy pomocy TailwindCSS lub CSS Modules).

## 2. Backend (Python / FastAPI)
- **Osobny serwis API:** Dostarczający dane dla klienta React.
- **Endpointy:** 
  - `GET /api/quizzes` – pobieranie listy pytań quizowych.
  - `GET /api/factors` – pobieranie danych o nawykach, stymulantach i ich wpływie na mózg.

## 3. Baza Danych (MongoDB)
- **Kolekcja `questions`:** Pytania do quizu, możliwe odpowiedzi, prawidłowa odpowiedź, opcjonalnie odnośnik do słowniczka.
- **Kolekcja `brain_factors`:** Definicje nawyków/stymulantów, obszary mózgu do podświetlenia (identyfikatory dla frontendu), krótki opis zjawiska.
