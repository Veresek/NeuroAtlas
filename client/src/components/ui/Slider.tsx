import type { InputHTMLAttributes } from "react";

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	color?: string;
	displayValue?: string;
}

export function Slider({
	label,
	value,
	min,
	max,
	step = 1,
	color = "#00aaff",
	displayValue,
	className = "",
	...props
}: SliderProps) {
	const pct = ((value - min) / (max - min)) * 100;
	const trackStyle = {
		background: `linear-gradient(to right, ${color} ${pct}%, #e5e7eb ${pct}%)`,
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-3">
				<span className="text-[13px] font-semibold text-gray-700">{label}</span>
				<span
					className="text-[12px] font-bold px-2 py-0.5 rounded-lg"
					style={{ color, background: `${color}1a`, minWidth: 38, textAlign: "center" }}
				>
					{displayValue ?? value}
				</span>
			</div>
			<div className="relative py-1">
				<div
					className="absolute top-1/2 left-0 right-0 h-1 rounded-full -translate-y-1/2"
					style={trackStyle}
				/>
				<input
					type="range"
					min={min}
					max={max}
					step={step}
					value={value}
					className={`neuroatlas-slider w-full ${className}`}
					style={{ "--slider-color": color } as React.CSSProperties}
					{...props}
				/>
			</div>
		</div>
	);
}

export default Slider;
