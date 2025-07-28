"use client"

import ercEuLogo from "@/images/LOGO_ERC-FLAG_FP.png";
import uniLogo from "@/images/UniGrignet2018-RGB.png";
import evomecLogoLight from "@/images/Evomec_Logo_light.png";
import evomecLogoDark from "@/images/Evomec_Logo_dark.png";
import {
  InstagramLogoIcon,
  LinkedInLogoIcon,
  TwitterLogoIcon,
} from "@radix-ui/react-icons";
import Image from "next/image";
import { useTheme } from "next-themes";
import { EvoNestLogo } from "./evonest-logo";


interface Icon {
  icon: JSX.Element;
  url: string;
}

const icons: Icon[] = [
  { icon: <LinkedInLogoIcon />, url: "#" },
  { icon: <InstagramLogoIcon />, url: "#" },
  { icon: <TwitterLogoIcon />, url: "#" },
];

type Link = {
  text: string;
  url: string;
};

const links: Link[] = [
  { text: "Developer: Daniele Liprandi", url: "#" },
  { text: "Research Group: Evo|Mec Laboratory", url: "#" },
  { text: "Institution: Universität Greifswald", url: "#" },
];

export function Footer() {
  const { theme } = useTheme();
  
  return (
    <footer className="flex flex-col gap-y-4 rounded-lg px-7 py-3 md:px-10">
      {/* First line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <EvoNestLogo size="md" />
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            EvoNEST Backbone
          </h2>
        </div>

        <div className="flex gap-x-2">
          {icons.map((icon, index) => (
            <a
              key={index}
              href={icon.url}
              className="flex h-5 w-5 items-center justify-center text-neutral-400 transition-all duration-100 ease-linear hover:text-neutral-900 hover:underline hover:underline-offset-4 dark:font-medium dark:text-neutral-500 hover:dark:text-neutral-100"
            >
              {icon.icon}
            </a>
          ))}
        </div>
      </div>
      {/* Second line */}
      <div className="flex flex-col justify-between gap-y-5 md:flex-row md:items-center">
        <div className="flex flex-col gap-y-2">
          <ul className="flex flex-col gap-x-5 gap-y-1 text-neutral-500 md:flex-row md:items-center">
            {links.map((link, index) => (
              <li
                key={index}
                className="text-[14px]/normal font-medium text-neutral-600 dark:text-neutral-400"
              >
                {link.text}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex items-center justify-center gap-x-4">
          <Image
            className="h-12 w-auto"
            src={uniLogo}
            alt="Universität Greifswald"
          />
          <Image
            className="h-8 w-auto"
            src={theme === 'dark' ? evomecLogoDark : evomecLogoLight}
            alt="Evo|Mec Laboratory"
          />
          <Image
            className="h-12 w-auto"
            src={ercEuLogo}
            alt="European Research Council"
          />
        </div>
      </div>
      
      {/* Third line - Funding acknowledgment */}
      <div className="flex flex-col gap-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
        <p className="text-center text-[13px]/normal text-neutral-500 dark:text-neutral-400">
          This project has received funding from the European Research Council (ERC) under the European Union&apos;s Horizon 2020 research and innovation programme
        </p>
        <p className="text-center text-[13px]/normal font-semibold text-neutral-600 dark:text-neutral-300">
          Grant Agreement No. 101040724—SuPerSilk
        </p>
        <p className="text-center text-[12px]/normal text-neutral-400 dark:text-neutral-500">
          © 2025 Open source application by Daniele Liprandi, Jonas Wolff, Universität Greifswald. Licensed under AGPL.
        </p>
      </div>
    </footer>
  );
}
