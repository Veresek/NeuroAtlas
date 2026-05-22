import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import ChangelogPage from "./pages/ChangelogPage.tsx";
import { MyBrainProvider } from "./features/my-brain/context/MyBrainProvider";
import "./style.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<MyBrainProvider>
			<BrowserRouter basename="/NeuroAtlas">
				<Routes>
					<Route path="/" element={<App />} />
					<Route path="/changelog" element={<ChangelogPage />} />
				</Routes>
			</BrowserRouter>
		</MyBrainProvider>
	</StrictMode>,
);
