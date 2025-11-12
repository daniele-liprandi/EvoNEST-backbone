---
layout: home

hero:
  name: "EvoNEST Backbone"
  text: "User documentation & Developer Documentation"
  tagline: "Learn how to use EvoNEST and contribute to the platform"
  image:
    light: /EvoNESTlogo.svg
    dark: /EvoNESTlogo_dark.svg
    alt: EvoNEST Logo
  actions:
    - theme: brand
      text: Step-by-step guide
      link: /tutorial/
    - theme: alt
      text: EvoNEST User guide
      link: /user-docs/
    - theme: alt
      text: Technical docs
      link: /developer-docs/

features:
  - icon: 🗄️
    title: Multi-database architecture
    details: Isolate data by lab or project. Users can access multiple databases with full data sovereignty and GDPR compliance.

  - icon: 🔐
    title: Flexible authentication
    details: Support for Google OAuth, Keycloak (EU-compliant), or custom NextAuth providers. Full control over user access and permissions.

  - icon: 🐳
    title: Docker-based deployment
    details: Simple installation with Docker Compose. Automated backups, easy scaling, and portable across Windows, macOS, and Linux.

  - icon: 🔧
    title: Highly customizable
    details: Define your own sample types, trait types, equipment lists, and ID generation rules. Extend with custom components and parsers. 
---

## Welcome to EvoNEST Documentation

This documentation site provides guides for both users and developers of the EvoNEST platform. Whether you're a [researcher looking to install EvoNEST for their lab](/tutorial), a [user of an existing NEST](/user-docs), or a [developer wanting to contribute](/developer-docs), you'll find the resources you need here.

## About EvoNEST

EvoNEST (Evolutionary, ecological and biological Nexus of Experiments, Samples, and Traits) is a web-based platform designed for researchers to collect, analyze, and share data across diverse animal species. The platform focuses on organismal research and collaborative data management.

<div style="margin: 1.5rem 0;">
  <a href="https://doi.org/10.7717/peerj-cs.3186" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: space-between; padding: 0.5rem 1rem; background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 0.95rem; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease; min-width: 280px; max-width: 320px;">
    <span style="display: flex; align-items: center; gap: 0.5rem;">
      <svg style="width: 20px; height: 20px; fill: white;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      <strong>PeerJ</strong>
    </span>
    <span style="font-family: monospace; font-size: 0.85rem; opacity: 0.95;">10.7717/peerj-cs.3186</span>
  </a>
</div>

### Our mission

EvoNEST aims to **democratise access to biodiversity data**, **preserve data privacy and ownership**, and **increase the efficiency of laboratories** dealing with different types of organismal data. We help laboratories and researchers by centralising, annotating, and harmonising their data, making ecological, evolutionary and biological analysis easier and more transparent. As the scientific community and funding agencies increasingly require transparency and data preservation, EvoNEST provides a unified platform for data collection, storage, and organism maintenance. By aiding the digitisation of phenotypic data, we want EvoNEST to contribute to advancing our understanding of biodiversity and evolutionary processes. 



<script setup>
import { VPTeamMembers } from 'vitepress/theme'

const members = [
  {
    avatar: 'https://www.github.com/daniele-liprandi.png',
    name: 'Daniele Liprandi',
    title: 'Creator & Developer',
    links: [
      { icon: 'github', link: 'https://github.com/daniele-liprandi' },
      { icon: 'gitlab', link: 'https://gitlab.com/DanieleLiprandi' },
      { icon: 'bluesky', link: 'https://bsky.app/profile/danieleliprandi.bsky.social'},
      { icon: 'linkedin', link: 'https://www.linkedin.com/in/daniele-liprandi-8a4199187/'},
    ]
  },
  {
    avatar: 'https://zoologie.uni-greifswald.de/storages/uni-greifswald/fakultaet/mnf/biologie/zoologie/allg_und_syst_zool/Staff/Jonas_Wolff.jpg',
    name: 'Jonas Wolff',
    title: 'Creator',
    links: [
      {
        icon: {
          svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Website</title><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
        },
        link: 'https://zoologie.uni-greifswald.de/struktur/abteilungen/allgemeine-und-systematische-zoologie/personal/dr-jonas-wolff/'
      },
      { icon: 'bluesky', link:'https://bsky.app/profile/wolffspider.bsky.social'}
    ]
  }
]
</script>

## Our team

<VPTeamMembers size="small" :members />

## Need help?

- Browse the documentation sections above
- Check our [FAQ](/user-docs/faq) for common questions
- Visit the main [EvoNEST application](/) to start using the platform
- Report issues or contribute on [GitHub](https://github.com/daniele-liprandi/EvoNEST-backbone)



<footer style="margin-top: 3rem; padding: 2rem 0;">

<div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 2rem; max-width: 1200px; margin: 0 auto;">

<div style="flex: 1; min-width: 300px;">
<h4 style="margin-bottom: 1rem;">About EvoNEST</h4>
<p style="margin-bottom: 0.5rem; font-size: 0.9rem;"><strong>Developer:</strong> Daniele Liprandi</p>
<p style="margin-bottom: 0.5rem; font-size: 0.9rem;"><strong>Research Group:</strong> Evo|Mec Laboratory</p>
<p style="margin-bottom: 1rem; font-size: 0.9rem;"><strong>Institution:</strong> Universität Greifswald</p>
</div>

<div style="flex: 1; min-width: 200px; text-align: center;">
<img src="/UniGrignet2018-RGB.png" alt="Universität Greifswald" style="max-height: 60px; margin-bottom: 1rem; display: block; margin-left: auto; margin-right: auto;">
<br>
<img src="/Evomec_Logo.png" alt="Evo|Mec Laboratory" style="max-height: 40px; display: block; margin-left: auto; margin-right: auto;">
</div>

<div style="flex: 1; min-width: 300px; text-align: right;">
<img src="/LOGO_ERC-FLAG_FP.png" alt="ERC European Union" style="max-height: 60px; margin-bottom: 1rem; margin-left: auto; display: block;">
<p style="font-size: 0.8rem; line-height: 1.4;">
This project has received funding from the European Research Council (ERC) under the European Union's Horizon 2020 research and innovation programme<br>
<strong>Grant Agreement No. 101040724—SuPerSilk</strong>
</p>
</div>

</div>

<div style="text-align: center; margin-top: 2rem; padding-top: 1rem;">
© 2025 EvoNEST Platform. All rights reserved.
</div>

</footer>
