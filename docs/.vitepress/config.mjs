import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'EvoNEST Docs',
  description: 'User guide and documentation for EvoNEST Backbone',
  base: '/EvoNEST-backbone/', // Match your actual repository name
  ignoreDeadLinks: true, // Ignore dead links during build (for placeholder pages)
    vite: {
    css: {
      postcss: {
        plugins: [] // Empty PostCSS plugins to avoid parent project conflicts
      }
    }
  },
    themeConfig: {
    logo: {
      light: '/EvoNESTlogo.svg',
      dark: '/EvoNESTlogo_dark.svg'
    },
    
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Step-by-Step Guide', link: '/tutorial/' },
      { text: 'User Docs', link: '/user-docs/' },
      { text: 'Technical Docs', link: '/developer-docs/' },
      { text: 'Demo', link: '/demo'},
      {
        text: 'API Docs',
        link: '/api-docs.html',
        target: '_self'
      }
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started/' },
            { text: 'Quick Start', link: '/getting-started/quick-start' },
          ]
        }
      ],

      '/tutorial/': [
        {
          text: 'Workshop',
          items: [
            { text: 'Workshop Overview', link: '/tutorial/' },
            { text: 'Module 1: Preparation', link: '/tutorial/01-preparation' },
            { text: 'Module 2: Installation', link: '/tutorial/02-installation' },
            { text: 'Module 3: First Launch', link: '/tutorial/03-first-launch' },
            { text: 'Module 4: Configuration', link: '/tutorial/04-configuration' },
            { text: 'Module 5: Data Entry', link: '/tutorial/05-data-entry' },
            { text: 'Module 6: Troubleshooting', link: '/tutorial/06-troubleshooting' },
          ]
        }
      ],

      '/user-docs/': [
        {
          text: 'User documentation',
          items: [
            { text: 'Overview', link: '/user-docs/' },
            { text: 'NEST Setup', link: '/user-docs/nest-setup' },
            { text: 'User Management', link: '/user-docs/user-account'},
            { text: 'Data Import', link: '/user-docs/data-import' },
            { text: 'Data Collection', link: '/user-docs/data-collection' },
            { text: 'Data Analysis', link: '/user-docs/data-analysis' },
            { text: 'Data Export', link: '/user-docs/data-export' },
            { text: 'FAQ', link: '/user-docs/faq' }
          ]
        }
      ],

      '/developer-docs/': [
        {
          text: 'Developer Docs',
          items: [
            { text: 'Overview', link: '/developer-docs/' },
          ]
        },
        {
          text: 'Authentication Setup',
          items: [
            { text: 'Google OAuth Setup', link: '/developer-docs/auth-google' },
            { text: 'EU-Compliant Auth (Keycloak)', link: '/developer-docs/auth-eu-compliant' },
          ]
        },
        {
          text: 'Customization',
          items: [
            { text: 'Custom Card Development', link: '/developer-docs/component-development' },
            { text: 'Data Format Parser Development', link: '/developer-docs/data-format-parser-development' },
            { text: 'File Processor Development', link: '/developer-docs/file-processor-development' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/daniele-liprandi/EvoNEST-backbone' } // Update with your repo
    ],

    footer: {
      message: 'Released under the AGPL License.',
    },

    search: {
      provider: 'local'
    }
  }
})
