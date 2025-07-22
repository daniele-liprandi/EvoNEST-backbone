import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { TaxonomicInput } from "@/components/ui/custom/TaxonomicInput"
import { ImageGBIFSearch } from "@/components/ImageGBIFSearch"
import { SetStateAction, useState } from "react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type TaxonomicData = {
    class?: string;
    order?: string;
    family?: string;
    genus?: string;
    species?: string;
};

interface TaxonomicInfoDisplayProps {
    taxonomicData?: TaxonomicData;
}

const TaxonomicInfoDisplay = ({ taxonomicData }: TaxonomicInfoDisplayProps) => {
    if (!taxonomicData) return null;
    
    try {
        return (
            <div className="space-y-2">
                <div className="flex h-05 items-center space-x-3 text-muted-foreground text-xs">
                    <div>{taxonomicData.class}</div>
                    <Separator orientation="vertical" />
                    <div>{taxonomicData.order}</div>
                    <Separator orientation="vertical" />
                    <div>{taxonomicData.family}</div>
                    <Separator orientation="vertical" />
                    <div>{taxonomicData.genus}</div>
                    <Separator orientation="vertical" />
                    <div>{taxonomicData.species}</div>
                </div>
            </div>
        );
    } catch (error) {
        return (
            <div>
                <Label>Taxon not found</Label>
            </div>
        );
    }
};

export const NameCheckerCard = () => {
    const [taxonomicData, setTaxonomicData] = useState();
    const [inputValue, setInputValue] = useState('');

    const handleValidated = (result: { data: any; }) => {
        if (result && result.data) {
            setTaxonomicData(result.data);
        }
    };

    const handleChange = (e: { target: { value: SetStateAction<string>; }; }) => {
        setInputValue(e.target.value);
    };

    return <Card className=" [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]">
        <CardHeader>
            <CardTitle>Name Checker</CardTitle>
            <CardDescription>
                Check names against the Global Names Verifier.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-3">
                <TaxonomicInput
                    value={inputValue}
                    onChange={handleChange}
                    onBlur={() => {}} // Optional blur handler
                    onCorrected={(correctedName: SetStateAction<string>, source: any) => {
                        setInputValue(correctedName);
                    }}
                    onValidated={handleValidated}
                    placeholder="Enter scientific name"
                    source="auto"
                    autoCorrect={true}
                    validationMode="fullTaxaInfo"
                    className=""
                    disabled={false}
                    name="scientific-name"
                />
                {taxonomicData && <TaxonomicInfoDisplay taxonomicData={taxonomicData} />}
                {taxonomicData && <ImageGBIFSearch GNRdata={taxonomicData} />}
            </div>
        </CardContent>
    </Card>
}