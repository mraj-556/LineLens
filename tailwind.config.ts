/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                'll': {
                    bg: '#0f0f11',
                    surface: '#1a1a1f',
                    surfaceHover: '#24242b',
                    border: '#2a2a35',
                    borderActive: '#4f46e5',
                    primary: '#6366f1',
                    primaryHover: '#818cf8',
                    text: '#e4e4e7',
                    textMuted: '#71717a',
                    textDim: '#52525b',
                    accent: '#22d3ee',
                    danger: '#ef4444',
                    dangerHover: '#f87171',
                    success: '#10b981',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.25s ease-out',
                'slide-down': 'slideDown 0.2s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            boxShadow: {
                'glow': '0 0 15px rgba(99, 102, 241, 0.15)',
                'glow-lg': '0 0 30px rgba(99, 102, 241, 0.2)',
            }
        },
    },
    plugins: [],
}
