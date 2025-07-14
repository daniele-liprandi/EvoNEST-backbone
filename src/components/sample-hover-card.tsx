import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"
import Link from "next/link";

// Define an interface for Sample if it doesn't exist yet
interface Sample {
    family: string;
    genus: string;
    species: string;
    _id: string;
    logbook?: [string, string][]; // Array of tuples, each containing two strings
}

interface SampleHoverCardProps {
    trigger: string;
    sample: Sample;
}

export const SampleHoverCard: React.FC<SampleHoverCardProps> = ({ trigger, sample }) => {
    const name = `${sample.family} ${sample.genus} ${sample.species}`;
    const { logbook } = sample;

    const destinationurl = `/sample/`+sample._id;

    if (logbook) {
        return (
            <HoverCard>
                <HoverCardTrigger asChild>
                    <Link href={destinationurl} rel="noopener noreferrer" target="_blank">{trigger}</Link>
                </HoverCardTrigger>
                <HoverCardContent>
                    <div className="flex justify-between space-x-4">
                        <div className="space-y-1">
                            <h3 className="text-sm font-semibold">{name}</h3>
                            <h4 className="text-sm">Logbook:</h4>
                            {logbook.map(([date, log], index) => (
                                <div key={index} className="text-sm">
                                    {new Date(date).toLocaleDateString("en-UK", {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: 'numeric',
                                    })} - {log}
                                </div>
                            ))}
                        </div>
                    </div>
                </HoverCardContent>
            </HoverCard>
        );
    } else {
        // Handle the case where logbook is undefined or empty
        return (
            <HoverCard>
                <HoverCardTrigger asChild>
                    <Link href={destinationurl} rel="noopener noreferrer" target="_blank">{trigger}</Link>
                </HoverCardTrigger>
                <HoverCardContent>
                    <div className="flex justify-between space-x-4">
                        <div className="space-y-1">
                            <h3 className="text-sm font-semibold">{name}</h3>
                            <p className="text-sm">No logbook entries.</p>
                        </div>
                    </div>
                </HoverCardContent>
            </HoverCard>
        );
    }
};
