import ercEuLogo from "@/images/LOGO_ERC-FLAG_FP.png";
import {
  InstagramLogoIcon,
  LinkedInLogoIcon,
  TwitterLogoIcon,
} from "@radix-ui/react-icons";
import Image from "next/image";
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
  { text: "This project is supported by ANONYMOUS", url: "#" },
];

export function Footer() {
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
        <ul className="flex flex-col gap-x-5 gap-y-2 text-neutral-500 md:flex-row md:items-center ">
          {links.map((link, index) => (
            <li
              key={index}
              className="text-[15px]/normal font-medium text-neutral-400 transition-all duration-100 ease-linear hover:text-neutral-900 hover:underline hover:underline-offset-4 dark:font-medium dark:text-neutral-400 hover:dark:text-neutral-100"
            >
              <a href={link.url}>{link.text}</a>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-start gap-x-4">
          {/* <Image
            className="h-10 w-auto"
            src={uniLogo}
            alt="University Anonymous Logo"
          /> */}
          <Image
            className="h-10 w-auto"
            src={ercEuLogo}
            alt="Erc EU Logo"
          />
        </div>
        <div className="flex items-center justify-between text-sm font-medium tracking-tight text-neutral-500 dark:text-neutral-400">
          <p>APGL</p>
        </div>
      </div>
    </footer>
  );
}
