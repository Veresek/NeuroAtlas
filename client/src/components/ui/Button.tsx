import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'success' | 'outline' | 'ghost';
	fullWidth?: boolean;
}

export function Button({
	children,
	variant = 'primary',
	fullWidth = false,
	className = '',
	...props
}: ButtonProps) {
	const baseStyles =
		'px-4 py-3 rounded-xl text-[13px] font-bold tracking-wide transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 border-0 disabled:opacity-50 disabled:cursor-not-allowed';

	const variants = {
		primary:
			'text-white bg-[#00aaff] hover:bg-[#0099e6] hover:-translate-y-0.5',
		success:
			'text-white bg-green-500 hover:bg-green-600 hover:-translate-y-0.5',
		outline:
			'bg-transparent border-2 border-[#00aaff] text-[#00aaff] hover:bg-[#00aaff]/5',
		ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
	};

	const widthClass = fullWidth ? 'w-full' : '';

	return (
		<button
			className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
			{...props}>
			{children}
		</button>
	);
}

export default Button;
