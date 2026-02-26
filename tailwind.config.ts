import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			gold: {
  				DEFAULT: 'var(--gold)',
  				foreground: 'var(--gold-foreground)',
  				muted: 'var(--gold-muted)'
  			},
  			success: {
  				DEFAULT: 'var(--success)',
  				muted: 'var(--success-muted)'
  			},
  			warning: {
  				DEFAULT: 'var(--warning)',
  				muted: 'var(--warning-muted)'
  			},
  			info: {
  				DEFAULT: 'var(--info)',
  				muted: 'var(--info-muted)'
  			},
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)'
  			},
  			sidebar: {
  				DEFAULT: 'var(--sidebar)',
  				foreground: 'var(--sidebar-foreground)',
  				primary: 'var(--sidebar-primary)',
  				'primary-foreground': 'var(--sidebar-primary-foreground)',
  				accent: 'var(--sidebar-accent)',
  				'accent-foreground': 'var(--sidebar-accent-foreground)',
  				border: 'var(--sidebar-border)',
  				ring: 'var(--sidebar-ring)'
  			},
  			'gold-primary': 'var(--gold-primary)',
  			'gold-bright': 'var(--gold-bright)',
  			'gold-text': 'var(--gold-text)',
  			'gold-bg': 'var(--gold-bg)',
  			'gold-bg-strong': 'var(--gold-bg-strong)',
  			'border-subtle': 'var(--border-subtle)',
  			'border-hover': 'var(--border-hover)',
  			'border-gold': 'var(--border-gold)',
  			'border-sidebar': 'var(--border-sidebar)',
  			'bg-elevated': 'var(--bg-elevated)',
  			'bg-input-custom': 'var(--bg-input)',
  			'text-tertiary': 'var(--text-tertiary)',
  			'text-ghost': 'var(--text-ghost)',
  			'success-muted': 'var(--success-muted)',
  			'info-muted': 'var(--info-muted)',
  			'warning-muted': 'var(--warning-muted)',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			card: '14px',
  			btn: '8px',
  			badge: '20px',
  		},
  		animation: {
  			'page-enter': 'fadeIn 0.4s ease forwards',
  		},
  		keyframes: {
  			fadeIn: {
  				from: { opacity: '0', transform: 'translateY(8px)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
