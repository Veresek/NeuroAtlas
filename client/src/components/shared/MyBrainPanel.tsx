import { useState } from "react";
import MyBrainIcon from "@/assets/my-brain.svg?react";
import CloseIcon from "@/assets/close.svg?react";
import CheckIcon from "@/assets/check.svg?react";
import { Button } from "../ui/Button";

interface MyBrainPanelProps {
	onClose: () => void;
}

const moodLabels = ["Awful", "Bad", "Neutral", "Good", "Great"];
const moodColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#00aaff"];

function MyBrainPanel({ onClose }: MyBrainPanelProps) {
	const [sleep, setSleep] = useState(7);
	const [coffee, setCoffee] = useState(2);
	const [mood, setMood] = useState(2);
	const [isGenerating, setIsGenerating] = useState(false);

	const handleGenerate = () => {
		setIsGenerating(true);
		// Simulation/Generation logic will go here
	};

	return (
		<>
			{/* Backdrop */}
			<div
				onClick={onClose}
				style={{
					position: "fixed",
					inset: 0,
					background: "rgba(0,0,0,0.35)",
					backdropFilter: "blur(4px)",
					zIndex: 40,
					animation: "fadeIn 0.2s ease",
				}}
			/>

			{/* Panel */}
			<div
				style={{
					position: "fixed",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					zIndex: 50,
					width: "min(480px, 92vw)",
					background: "linear-gradient(145deg, rgba(255,255,255,0.97), rgba(240,248,255,0.97))",
					borderRadius: "24px",
					boxShadow: "0 32px 80px rgba(0,170,255,0.18), 0 8px 32px rgba(0,0,0,0.12)",
					border: "1px solid rgba(0,170,255,0.15)",
					padding: "32px",
					animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",
				}}
			>
				{/* Header */}
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<div
							style={{
								width: "40px", height: "40px", borderRadius: "12px",
								background: "linear-gradient(135deg, #00aaff22, #00aaff44)",
								display: "flex", alignItems: "center", justifyContent: "center",
							}}
						>
							<MyBrainIcon className="w-5 h-5 text-[#00aaff]" />
						</div>
						<div>
							<h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" }}>
								My Brain
							</h2>
							<p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>How do you feel today?</p>
						</div>
					</div>
					<button
						onClick={onClose}
						style={{
							width: "32px", height: "32px", borderRadius: "8px", border: "none",
							background: "rgba(0,0,0,0.06)", cursor: "pointer", display: "flex",
							alignItems: "center", justifyContent: "center", color: "#6b7280",
							transition: "all 0.15s",
						}}
						onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.12)"; }}
						onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.06)"; }}
					>
						<CloseIcon className="w-[14px] h-[14px]" />
					</button>
				</div>

				{/* Questions */}
				<div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

					{/* Sleep */}
					<div>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<span style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>How many hours did you sleep?</span>
							</div>
							<span
								style={{
									fontSize: "14px", fontWeight: 700, color: "#00aaff",
									background: "rgba(0,170,255,0.1)", borderRadius: "8px",
									padding: "2px 10px", minWidth: "44px", textAlign: "center",
								}}
							>
								{sleep}h
							</span>
						</div>
						<div style={{ position: "relative", padding: "4px 0" }}>
							<div style={{
								position: "absolute", top: "50%", left: 0, right: 0,
								height: "4px", borderRadius: "2px", transform: "translateY(-50%)",
								background: `linear-gradient(to right, #00aaff ${(sleep / 12) * 100}%, #e5e7eb ${(sleep / 12) * 100}%)`,
							}} />
							<input
								id="sleep-slider"
								type="range"
								min={0}
								max={12}
								step={0.5}
								value={sleep}
								onChange={e => setSleep(Number(e.target.value))}
								style={{ width: "100%", appearance: "none", background: "transparent", cursor: "pointer", height: "20px", position: "relative" }}
							/>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
							<span style={{ fontSize: "11px", color: "#9ca3af" }}>0h</span>
							<span style={{ fontSize: "11px", color: "#9ca3af" }}>6h</span>
							<span style={{ fontSize: "11px", color: "#9ca3af" }}>12h</span>
						</div>
					</div>

					{/* Coffee */}
					<div>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<span style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>How many coffees did you drink?</span>
							</div>
							<span
								style={{
									fontSize: "14px", fontWeight: 700, color: "#f97316",
									background: "rgba(249,115,22,0.1)", borderRadius: "8px",
									padding: "2px 10px", minWidth: "44px", textAlign: "center",
								}}
							>
								{coffee === 0 ? "none" : coffee === 1 ? "1 coffee" : `${coffee} coffees`}
							</span>
						</div>
						<div style={{ position: "relative", padding: "4px 0" }}>
							<div style={{
								position: "absolute", top: "50%", left: 0, right: 0,
								height: "4px", borderRadius: "2px", transform: "translateY(-50%)",
								background: `linear-gradient(to right, #f97316 ${(coffee / 10) * 100}%, #e5e7eb ${(coffee / 10) * 100}%)`,
							}} />
							<input
								id="coffee-slider"
								type="range"
								min={0}
								max={10}
								step={1}
								value={coffee}
								onChange={e => setCoffee(Number(e.target.value))}
								style={{ width: "100%", appearance: "none", background: "transparent", cursor: "pointer", height: "20px", position: "relative" }}
							/>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
							<span style={{ fontSize: "11px", color: "#9ca3af" }}>0</span>
							<span style={{ fontSize: "11px", color: "#9ca3af" }}>5</span>
							<span style={{ fontSize: "11px", color: "#9ca3af" }}>10</span>
						</div>
					</div>

					{/* Mood */}
					<div>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<span style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>How is your mood?</span>
							</div>
							<span
								style={{
									fontSize: "14px", fontWeight: 700, color: moodColors[mood],
									background: `${moodColors[mood]}1a`, borderRadius: "8px",
									padding: "2px 10px", minWidth: "64px", textAlign: "center",
									transition: "all 0.25s",
								}}
							>
								{moodLabels[mood]}
							</span>
						</div>
						<div style={{ position: "relative", padding: "4px 0" }}>
							<div style={{
								position: "absolute", top: "50%", left: 0, right: 0,
								height: "4px", borderRadius: "2px", transform: "translateY(-50%)",
								background: `linear-gradient(to right, ${moodColors[mood]} ${(mood / 4) * 100}%, #e5e7eb ${(mood / 4) * 100}%)`,
								transition: "background 0.25s",
							}} />
							<input
								id="mood-slider"
								type="range"
								min={0}
								max={4}
								step={1}
								value={mood}
								onChange={e => setMood(Number(e.target.value))}
								style={{ width: "100%", appearance: "none", background: "transparent", cursor: "pointer", height: "20px", position: "relative" }}
							/>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
							{moodLabels.map((label, i) => (
								<span
									key={label}
									style={{
										fontSize: "10px", color: mood === i ? moodColors[i] : "#9ca3af",
										fontWeight: mood === i ? 700 : 400,
										transition: "all 0.2s",
									}}
								>
									{label}
								</span>
							))}
						</div>
					</div>
				</div>

				{/* Generate button */}
				<Button
					id="my-brain-generate"
					onClick={handleGenerate}
					fullWidth
					variant="primary"
					disabled={isGenerating}
					className="mt-8"
				>
					{isGenerating ? "Generating..." : "Generate"}
				</Button>
			</div>

			<style>{`
				@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
				@keyframes slideUp { from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)); } to { opacity: 1; transform: translate(-50%, -50%); } }

				input[type=range] { -webkit-appearance: none; appearance: none; }
				input[type=range]::-webkit-slider-thumb {
					-webkit-appearance: none;
					width: 20px; height: 20px;
					border-radius: 50%;
					background: #fff;
					border: 2.5px solid #00aaff;
					box-shadow: 0 2px 8px rgba(0,170,255,0.3);
					cursor: pointer;
					transition: transform 0.15s, box-shadow 0.15s;
				}
				input[type=range]::-webkit-slider-thumb:hover {
					transform: scale(1.2);
					box-shadow: 0 4px 14px rgba(0,170,255,0.45);
				}
				#coffee-slider::-webkit-slider-thumb { border-color: #f97316; box-shadow: 0 2px 8px rgba(249,115,22,0.3); }
				#coffee-slider::-webkit-slider-thumb:hover { box-shadow: 0 4px 14px rgba(249,115,22,0.45); }
				#mood-slider::-webkit-slider-thumb { border-color: currentColor; }
			`}</style>
		</>
	);
}

export default MyBrainPanel;
