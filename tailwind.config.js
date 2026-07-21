/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      /* ── Colors: map CSS variables to Tailwind utilities ── */
      colors: {
        /* Surface */
        'surface-root': 'var(--surface-root)',
        'surface-default': 'var(--surface-default)',
        'surface-elevated': 'var(--surface-elevated)',
        'surface-overlay': 'var(--surface-overlay)',

        /* Text */
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-disabled': 'var(--text-disabled)',
        'text-inverse': 'var(--text-inverse)',

        /* Border */
        'border-default': 'var(--border-default)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',

        /* Accent */
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-text': 'var(--color-accent-text)',
        'accent-muted': 'var(--color-accent-muted)',

        /* Semantic */
        success: 'var(--color-success)',
        'success-bg': 'var(--color-success-bg)',
        warning: 'var(--color-warning)',
        'warning-bg': 'var(--color-warning-bg)',
        error: 'var(--color-error)',
        'error-bg': 'var(--color-error-bg)',

        /* Brand */
        brand: 'var(--brand-pink)',
        'brand-light': 'var(--brand-pink-light)',
        'brand-dark': 'var(--brand-pink-dark)',

        /* Material */
        acrylic: 'var(--acrylic-bg)',
        mica: 'var(--mica-bg)',
      },

      /* ── Border Radius ── */
      borderRadius: {
        none: 'var(--radius-none)',
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },

      /* ── Box Shadow ── */
      boxShadow: {
        none: 'var(--shadow-none)',
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        ring: 'var(--shadow-ring)',
        glow: 'var(--shadow-glow)',
      },

      /* ── Spacing ── */
      spacing: {
        '1t': 'var(--space-1)',   /* 4px  — token-aligned */
        '2t': 'var(--space-2)',   /* 8px */
        '3t': 'var(--space-3)',   /* 12px */
        '4t': 'var(--space-4)',   /* 16px */
        '5t': 'var(--space-5)',   /* 20px */
        '6t': 'var(--space-6)',   /* 24px */
        '8t': 'var(--space-8)',   /* 32px */
        '10t': 'var(--space-10)', /* 40px */
        '12t': 'var(--space-12)', /* 48px */
      },

      /* ── Font Family ── */
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },

      /* ── Font Size ── */
      fontSize: {
        caption: [
          'var(--text-caption)',
          { lineHeight: 'var(--text-caption-lh)' },
        ],
        'body-sm': [
          'var(--text-body-sm)',
          { lineHeight: 'var(--text-body-sm-lh)' },
        ],
        body: ['var(--text-body)', { lineHeight: 'var(--text-body-lh)' }],
        'body-lg': [
          'var(--text-body-lg)',
          { lineHeight: 'var(--text-body-lg-lh)' },
        ],
        'heading-sm': [
          'var(--text-heading-sm)',
          { lineHeight: 'var(--text-heading-sm-lh)', fontWeight: '500' },
        ],
        heading: [
          'var(--text-heading)',
          { lineHeight: 'var(--text-heading-lh)', fontWeight: '600' },
        ],
        'heading-lg': [
          'var(--text-heading-lg)',
          { lineHeight: 'var(--text-heading-lg-lh)', fontWeight: '600' },
        ],
        'heading-xl': [
          'var(--text-heading-xl)',
          { lineHeight: 'var(--text-heading-xl-lh)', fontWeight: '700' },
        ],
      },

      /* ── Transition Duration ── */
      transitionDuration: {
        instant: 'var(--duration-instant)',
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        modal: 'var(--duration-modal)',
      },

      /* ── Transition Timing Function ── */
      transitionTimingFunction: {
        'ease-out': 'var(--ease-out)',
        'ease-in': 'var(--ease-in)',
        'ease-in-out': 'var(--ease-in-out)',
        'ease-spring': 'var(--ease-spring)',
      },

      /* ── Backdrop Blur ── */
      backdropBlur: {
        acrylic: 'var(--acrylic-blur)',
      },
    },
  },
  plugins: [],
}
