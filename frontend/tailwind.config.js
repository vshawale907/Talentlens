/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // ── Black & Gold Palette ──────────────────────
                primary: {
                    DEFAULT: '#111827',   // deep black
                    hover:   '#1F2937',   // slightly lighter black
                },
                accent: {
                    DEFAULT: '#F59E0B',   // gold
                    hover:   '#D97706',   // darker gold
                    light:   '#FCD34D',   // light gold
                    subtle:  '#FFFBEB',   // very light amber bg
                    border:  '#FDE68A',   // gold border
                },
                background: {
                    DEFAULT: '#FFFFFF',
                    card:    '#FFFFFF',
                    panel:   '#F9FAFB',
                    dark:    '#111827',   // sidebar / dark sections
                    darkCard:'#1F2937',   // dark card variant
                },
                text: {
                    primary:   '#111827',
                    secondary: '#6B7280',
                    muted:     '#9CA3AF',
                    inverse:   '#F9FAFB', // light text on dark backgrounds
                    gold:      '#F59E0B',
                },
                border: '#E5E7EB',
                // ── Status colors ─────────────────────────────
                success: { DEFAULT: '#16A34A', light: '#DCFCE7', border: '#86EFAC' },
                danger:  { DEFAULT: '#DC2626', light: '#FEF2F2', border: '#FECACA' },
                warn:    { DEFAULT: '#D97706', light: '#FFFBEB', border: '#FDE68A' },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            fontSize: {
                'xs':   ['0.75rem',   { lineHeight: '1.25rem'  }],
                'sm':   ['0.875rem',  { lineHeight: '1.5rem'   }],
                'base': ['1rem',      { lineHeight: '1.625rem' }],
                'lg':   ['1.125rem',  { lineHeight: '1.75rem'  }],
                'xl':   ['1.25rem',   { lineHeight: '1.875rem' }],
                '2xl':  ['1.5rem',    { lineHeight: '2rem'     }],
                '3xl':  ['1.875rem',  { lineHeight: '2.25rem'  }],
                '4xl':  ['2.25rem',   { lineHeight: '2.5rem'   }],
                '5xl':  ['3rem',      { lineHeight: '1.2'      }],
            },
            boxShadow: {
                'gold':  '0 0 0 3px rgba(245, 158, 11, 0.25)',
                'card':  '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.08)',
                'card-md': '0 4px 12px 0 rgba(0,0,0,0.08)',
                'card-lg': '0 8px 24px 0 rgba(0,0,0,0.10)',
            },
            animation: {
                'fade-in':     'fadeIn 0.5s ease-out',
                'slide-up':    'slideUp 0.4s ease-out',
                'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer':     'shimmer 1.4s ease-in-out infinite',
            },
            keyframes: {
                fadeIn:  { from: { opacity: '0' },               to: { opacity: '1' } },
                slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
                shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
                float:   { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
                dotBounce: { '0%, 60%, 100%': { transform: 'translateY(0)' }, '30%': { transform: 'translateY(-6px)' } },
            },
        },
    },
    plugins: [],
};
