import { cn, prepend_path } from "@/lib/utils";
import Marquee from "@/components/magicui/marquee";
import { useFilesData } from "@/hooks/useFilesData";
import { ReactElement, JSXElementConstructor, ReactNode, ReactPortal, AwaitedReactNode, Key } from "react";
import { Skeleton } from "../skeleton";

export function FilesMarquee() {
    const { filesData, filesError } = useFilesData(prepend_path);

    if (filesError) {
        return <div>Error: {filesError.message}</div>;
    }
    if (!filesData) {
        return <Skeleton  className="absolute top-10 [--duration:20s] [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] " />;
    }

    if (filesData.length === 0) {
        return ;
    }

    const randomfiles = filesData.sort(() => Math.random() - 0.5);
    const files = randomfiles.slice(0, 10);

    return (
        <Marquee
            pauseOnHover
            className="absolute top-10 [--duration:20s] [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] w-auto"
        >
            {files.map((file: { name: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; }, idx: Key | null | undefined) => (
                <figure
                    key={idx}
                    className={cn(
                        "relative w-32 cursor-pointer overflow-hidden rounded-xl border p-4",
                        "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
                        "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]",
                        "transform-gpu blur-[1px] transition-all duration-300 ease-out hover:blur-none",
                    )}
                >
                    <div className="flex flex-row items-center gap-2">
                        <div className="flex flex-col">
                            <figcaption className="text-sm font-medium dark:text-white ">
                                {file.name}
                            </figcaption>
                        </div>
                    </div>
                </figure>
            ))}
        </Marquee>
    );
}
