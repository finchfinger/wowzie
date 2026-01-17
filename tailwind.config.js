/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'Inter',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'sans-serif'
  			]
  		},
  		colors: {
  			wowzie: {
  				page: '#F4F4F5',
  				surface: '#FFFFFF',
  				surfaceSubtle: '#F9FAFB',
  				borderSubtle: '#E4E4E7',
  				text: {
  					primary: '#111827',
  					muted: '#4B5563',
  					subtle: '#6B7280',
  					onAccent: '#FFFFFF'
  				},
  				accent: {
  					primary: '#6D28D9',
  					primarySoft: '#DDD6FE',
  					primaryHover: '#5B21B6'
  				},
  				state: {
  					success: '#16A34A',
  					warning: '#D97706',
  					error: '#DC2626',
  					info: '#2563EB'
  				}
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			'card-foreground': '#111827',
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			'popover-foreground': '#111827',
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			'muted-foreground': '#6B7280',
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			'accent-foreground': '#111827',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			'destructive-foreground': '#FFFFFF',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontSize: {
  			display: [
  				'2rem',
  				{
  					lineHeight: '2.5rem'
  				}
  			],
  			h1: [
  				'1.5rem',
  				{
  					lineHeight: '2rem'
  				}
  			],
  			h2: [
  				'1.25rem',
  				{
  					lineHeight: '1.75rem'
  				}
  			],
  			h3: [
  				'1rem',
  				{
  					lineHeight: '1.5rem'
  				}
  			],
  			body: [
  				'0.875rem',
  				{
  					lineHeight: '1.375rem'
  				}
  			],
  			bodySm: [
  				'0.8125rem',
  				{
  					lineHeight: '1.25rem'
  				}
  			],
  			caption: [
  				'0.75rem',
  				{
  					lineHeight: '1rem'
  				}
  			]
  		},
  		boxShadow: {
  			card: '0 10px 30px rgba(15, 23, 42, 0.08)',
  			overlay: '0 18px 45px rgba(15, 23, 42, 0.18)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			xl: '1rem',
  			'2xl': '1.25rem',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
