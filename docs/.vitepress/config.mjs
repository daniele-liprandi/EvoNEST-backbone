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
      { text: 'Getting Started', link: '/getting-started/' },
      { text: 'User Guide', link: '/user-guide/' },
      { text: 'Developer Guide', link: '/developer-guide/' },
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
      
      '/user-guide/': [
        {
          text: 'User Guide',
          items: [
            { text: 'Overview', link: '/user-guide/' },
            { text: 'NEST Setup', link: '/user-guide/nest-setup' },
            { text: 'User management', link: 'user-guide/user-account'},
            { text: 'Data Import', link: '/user-guide/data-import' },
            { text: 'Data Collection', link: '/user-guide/data-collection' },
            { text: 'Data Analysis', link: '/user-guide/data-analysis' },
            { text: 'Data Export', link: '/user-guide/data-export' },
            { text: 'FAQ', link: '/user-guide/faq' }
          ]
        }
      ],
      
      '/developer-guide/': [
        {
          text: 'Developer Guide',
          items: [
            { text: 'Overview', link: '/developer-guide/' },
            { text: 'Experiment Parser Development', link: '/developer-guide/experiment-parser-development' },
            { text: 'Custom Card Development', link: '/developer-guide/component-development' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/daniele-liprandi/EvoNext' } // Update with your repo
    ],

    footer: {
      message: 'Released under the MIT License.',
    },

    search: {
      provider: 'local'
    }
  }
})
